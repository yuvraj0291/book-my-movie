import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
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
  const signature = (await headers()).get("x-razorpay-signature") || "";

  let event;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      logger.error("Razorpay webhook signature verification failed");
      return new Response("Invalid signature", { status: 400 });
    }
    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response("Invalid JSON body", { status: 400 });
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      logger.error("Razorpay webhook secret is missing in production environment");
      return new Response("Webhook secret missing", { status: 500 });
    }
    logger.warn("Razorpay webhook secret missing, parsing body directly (development mode)");
    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response("Invalid JSON body", { status: 400 });
    }
  }

  // Handle successful capture event
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const bookingId = payment.notes?.bookingId;
    const paymentId = payment.id;
    const orderId = payment.order_id;

    if (!bookingId) {
      logger.warn("Razorpay webhook: No bookingId found in payment notes", { paymentId });
      return NextResponse.json({ success: true, message: "Ignored, no bookingId" });
    }

    try {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) {
        logger.error(`Razorpay webhook: Booking ${bookingId} not found`, null, { paymentId });
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      // If booking is already confirmed, we return immediately
      if (booking.status === "CONFIRMED") {
        return NextResponse.json({ success: true, message: "Booking already confirmed" });
      }

      const success = await confirmBookingUseCase.execute(
        bookingId,
        "RAZORPAY",
        {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        },
        booking.user.email
      );

      if (success) {
        logger.info(`Razorpay webhook: Booking ${bookingId} confirmed successfully`);
        return NextResponse.json({ success: true });
      } else {
        logger.error(`Razorpay webhook: Failed to confirm booking ${bookingId}`);
        return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
      }
    } catch (e) {
      logger.error("Razorpay webhook processing error", e, { bookingId });
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: `Ignored event: ${event.event}` });
}
