import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PrismaBookingRepository } from "@/infrastructure/db/PrismaBookingRepository";
import { StripeRazorpayPaymentService } from "@/infrastructure/services/StripeRazorpayPaymentService";
import { ResendEmailService } from "@/infrastructure/services/ResendEmailService";
import { RedisCacheService } from "@/infrastructure/services/RedisCacheService";
import { PrismaAuditLogRepository } from "@/infrastructure/db/PrismaAuditLogRepository";
import { ConfirmBookingUseCase } from "@/core/use-cases/booking/ConfirmBookingUseCase";
import { logger } from "@/utils/logger";

const bookingRepository = new PrismaBookingRepository();
const paymentService = new StripeRazorpayPaymentService();
const emailService = new ResendEmailService();
const cacheService = new RedisCacheService();
const auditLogRepository = new PrismaAuditLogRepository();

const confirmBookingUseCase = new ConfirmBookingUseCase(
  bookingRepository,
  paymentService,
  emailService,
  cacheService,
  auditLogRepository
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") || "";

  let event;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error("Stripe webhook signature verification failed", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      logger.error("Stripe webhook secret is missing in production environment");
      return new Response("Webhook secret missing", { status: 500 });
    }
    logger.warn("Stripe webhook secret missing, parsing body directly (development mode)");
    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response("Invalid JSON body", { status: 400 });
    }
  }

  // Handle successful payment intent
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      logger.warn("Stripe webhook: No bookingId found in payment intent metadata", { paymentIntentId: paymentIntent.id });
      return NextResponse.json({ success: true, message: "Ignored, no bookingId" });
    }

    try {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) {
        logger.error(`Stripe webhook: Booking ${bookingId} not found`, null, { paymentIntentId: paymentIntent.id });
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      // If booking is already confirmed, we return immediately
      if (booking.status === "CONFIRMED") {
        return NextResponse.json({ success: true, message: "Booking already confirmed" });
      }

      const success = await confirmBookingUseCase.execute(
        bookingId,
        "STRIPE",
        { stripePaymentIntentId: paymentIntent.id },
        booking.user.email
      );

      if (success) {
        logger.info(`Stripe webhook: Booking ${bookingId} confirmed successfully`);
        return NextResponse.json({ success: true });
      } else {
        logger.error(`Stripe webhook: Failed to confirm booking ${bookingId}`);
        return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
      }
    } catch (e) {
      logger.error("Stripe webhook processing error", e, { bookingId });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: `Ignored event type: ${event.type}` });
}
