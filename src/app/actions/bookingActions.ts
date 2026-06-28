"use server";

import { auth } from "@/auth";
import { PrismaShowRepository } from "@/infrastructure/db/PrismaShowRepository";
import { PrismaBookingRepository } from "@/infrastructure/db/PrismaBookingRepository";
import { RedisCacheService } from "@/infrastructure/services/RedisCacheService";
import { StripeRazorpayPaymentService } from "@/infrastructure/services/StripeRazorpayPaymentService";
import { ResendEmailService } from "@/infrastructure/services/ResendEmailService";
import { PrismaAuditLogRepository } from "@/infrastructure/db/PrismaAuditLogRepository";
import { RedisRateLimiter } from "@/infrastructure/services/RateLimiter";
import { HoldSeatsUseCase } from "@/core/use-cases/booking/HoldSeatsUseCase";
import { ConfirmBookingUseCase } from "@/core/use-cases/booking/ConfirmBookingUseCase";
import QRCode from "qrcode";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

const showRepository = new PrismaShowRepository();
const bookingRepository = new PrismaBookingRepository();
const cacheService = new RedisCacheService();
const paymentService = new StripeRazorpayPaymentService();
const emailService = new ResendEmailService();
const auditLogRepository = new PrismaAuditLogRepository();
const rateLimiter = new RedisRateLimiter();

const holdSeatsUseCase = new HoldSeatsUseCase(showRepository, cacheService, auditLogRepository);
const confirmBookingUseCase = new ConfirmBookingUseCase(
  bookingRepository,
  paymentService,
  emailService,
  cacheService,
  auditLogRepository
);

const SECURE_SALT = "movierocks_secure_salt_2026";

// Helper to generate secure QR payload and QR Code Data URL
async function generateQRCodeForBooking(booking: any): Promise<string> {
  const validationHash = crypto
    .createHash("sha256")
    .update(`${booking.id}-${booking.showId}-${booking.userId}-${SECURE_SALT}`)
    .digest("hex");

  const qrPayload = JSON.stringify({
    bookingId: booking.id,
    theatre: booking.show.screen.theatre.name,
    screen: booking.show.screen.name,
    movie: booking.show.movie.title,
    seats: booking.showSeats.map((s: any) => `${s.seat.row}-${s.seat.number}`),
    startTime: booking.show.startTime,
    hash: validationHash.substring(0, 16),
  });

  return await QRCode.toDataURL(qrPayload);
}

export async function holdSeatsAndCreateBookingAction(
  showId: string,
  seatIds: string[],
  gateway: "STRIPE" | "RAZORPAY"
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }
  const userId = session.user.id;

  const limitKey = `rate_limit:hold_seats:${userId}`;
  const isLimited = await rateLimiter.isRateLimited(limitKey, 8, 60); // 8 hold attempts per minute
  if (isLimited) {
    return { error: "Too many seat hold attempts. Please wait a minute and try again." };
  }

  try {
    const holdSuccess = await holdSeatsUseCase.execute(showId, seatIds, userId);
    if (!holdSuccess) {
      return { error: "One or more seats are already locked or booked. Please try different seats." };
    }

    const show = await showRepository.findById(showId);
    if (!show) {
      return { error: "Show not found" };
    }

    const showSeats = await showRepository.findSeatsByShowId(showId);
    const seatsToBook = showSeats.filter(s => seatIds.includes(s.seatId));
    
    if (seatsToBook.length === 0) {
      return { error: "Invalid seat selection" };
    }

    const totalPrice = seatsToBook.reduce((acc, s) => acc + Number(s.price), 0);

    const booking = await bookingRepository.createPendingBooking(userId, showId, seatIds, totalPrice);

    const currency = "USD";
    const paymentIntent = await paymentService.createPaymentIntent(
      totalPrice,
      currency,
      booking.id,
      gateway
    );

    return {
      success: true,
      bookingId: booking.id,
      paymentIntent,
      expiresAt: Date.now() + 480 * 1000, // 8 minutes TTL
    };
  } catch (e: any) {
    console.error("holdSeatsAndCreateBookingAction failed:", e);
    return { error: e.message || "Failed to process seat hold" };
  }
}

export async function confirmBookingPaymentAction(
  bookingId: string,
  gateway: "STRIPE" | "RAZORPAY",
  paymentPayload: any
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id || !session.user.email) {
    return { error: "Authentication required" };
  }

  try {
    const success = await confirmBookingUseCase.execute(
      bookingId,
      gateway,
      paymentPayload,
      session.user.email
    );

    if (success) {
      return { success: true };
    } else {
      return { error: "Payment verification failed" };
    }
  } catch (e: any) {
    console.error("confirmBookingPaymentAction failed:", e);
    return { error: e.message || "Failed to confirm payment" };
  }
}

export async function cancelBookingAction(bookingId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) return { error: "Booking not found" };

    if (booking.userId !== session.user.id) {
      return { error: "Permission denied" };
    }

    // Restriction: Cannot cancel within 2 hours of showtime
    const now = new Date();
    const showTime = new Date(booking.show.startTime);
    const diffHours = (showTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      return { error: "Cancellations are only allowed up to 2 hours before showtime." };
    }

    const cancelled = await bookingRepository.cancelBooking(bookingId);
    if (!cancelled) {
      return { error: "Failed to cancel booking" };
    }

    // Audit Log
    await auditLogRepository.create(
      session.user.id,
      "BOOKING_CANCEL",
      `Cancelled booking ${bookingId}. Refund initiated.`
    );

    revalidatePath("/bookings");
    return { success: true };
  } catch (e: any) {
    console.error("cancelBookingAction failed:", e);
    return { error: e.message || "Failed to cancel booking" };
  }
}

export async function resendConfirmationEmailAction(bookingId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return { error: "Authentication required" };
  }

  try {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) return { error: "Booking not found" };

    if (booking.userId !== session.user.id) {
      return { error: "Permission denied" };
    }

    const qrCodeDataUrl = await generateQRCodeForBooking(booking);
    const seatLabels = booking.showSeats.map((s: any) => `${s.seat.row}-${s.seat.number}`).join(", ");
    const formattedDate = new Date(booking.show.startTime).toLocaleString();

    await emailService.send({
      to: session.user.email,
      subject: "Your Movie Tickets (Resent)! 🍿",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px;">🍿</span>
            <h2 style="color: #e11d48; margin: 8px 0 0 0; font-weight: 800; font-size: 24px;">Booking Details</h2>
            <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">Show this QR code at the cinema entrance</p>
          </div>
          
          <div style="text-align: center; margin: 24px 0; background-color: #fafafa; padding: 16px; border-radius: 12px; border: 1px dashed #e4e4e7;">
            <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto;" />
            <span style="font-family: monospace; font-size: 11px; color: #a1a1aa; display: block; margin-top: 8px;">Reference: ${bookingId}</span>
          </div>

          <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
          
          <h3 style="margin-top: 0; font-size: 16px; font-weight: 700; color: #18181b;">Details:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Movie</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.movie.title}</td></tr>
            <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Theatre</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.screen.theatre.name}</td></tr>
            <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Screen</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.screen.name}</td></tr>
            <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Time</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${formattedDate}</td></tr>
            <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Seats</th><td style="text-align: right; padding: 8px 0; font-weight: 700; color: #e11d48;">${seatLabels}</td></tr>
            <tr><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Amount Paid</th><td style="text-align: right; padding: 8px 0; font-weight: 700; color: #10b981;">$${booking.totalPrice}</td></tr>
          </table>
        </div>
      `,
    });

    return { success: true };
  } catch (e: any) {
    console.error("resendConfirmationEmailAction failed:", e);
    return { error: e.message || "Failed to resend email" };
  }
}

export async function getUserBookingsAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return [];
  }

  try {
    const bookings = await bookingRepository.findUserBookings(session.user.id);
    
    // Generate QR Code data URLs in parallel for the client
    return await Promise.all(
      bookings.map(async (b) => {
        const qrCodeDataUrl = b.status === "CONFIRMED" ? await generateQRCodeForBooking(b) : "";
        return {
          id: b.id,
          userId: b.userId,
          showId: b.showId,
          totalPrice: Number(b.totalPrice),
          status: b.status,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          qrCodeDataUrl,
          show: {
            startTime: b.show.startTime,
            movie: b.show.movie,
            screen: b.show.screen,
          },
          showSeats: b.showSeats.map(s => ({
            id: s.id,
            price: Number(s.price),
            seatId: s.seatId,
            seat: s.seat,
          })),
          payment: b.payment,
        };
      })
    );
  } catch (e) {
    console.error("getUserBookingsAction failed:", e);
    return [];
  }
}

export async function getBookingByIdAction(id: string) {
  try {
    const booking = await bookingRepository.findById(id);
    if (!booking) return null;

    const qrCodeDataUrl = booking.status === "CONFIRMED" ? await generateQRCodeForBooking(booking) : "";

    return {
      id: booking.id,
      userId: booking.userId,
      showId: booking.showId,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      qrCodeDataUrl,
      show: {
        startTime: booking.show.startTime,
        movie: booking.show.movie,
        screen: booking.show.screen,
      },
      showSeats: booking.showSeats.map(s => ({
        id: s.id,
        price: Number(s.price),
        seatId: s.seatId,
        seat: s.seat,
      })),
      payment: booking.payment,
    };
  } catch (e) {
    console.error(`getBookingByIdAction failed for ${id}:`, e);
    return null;
  }
}
