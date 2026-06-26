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
  const isLimited = await rateLimiter.isRateLimited(limitKey, 5, 60); // 5 hold attempts per minute
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

export async function getUserBookingsAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return [];
  }

  try {
    const bookings = await bookingRepository.findUserBookings(session.user.id);
    return bookings.map(b => ({
      id: b.id,
      userId: b.userId,
      showId: b.showId,
      totalPrice: Number(b.totalPrice),
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
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
    }));
  } catch (e) {
    console.error("getUserBookingsAction failed:", e);
    return [];
  }
}

export async function getBookingByIdAction(id: string) {
  try {
    const booking = await bookingRepository.findById(id);
    if (!booking) return null;
    return {
      id: booking.id,
      userId: booking.userId,
      showId: booking.showId,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
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
