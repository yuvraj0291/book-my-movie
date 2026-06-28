import { IBookingDetails, IBookingRepository } from "@/core/repositories/IBookingRepository";
import { db } from "@/lib/db";
import { Booking, BookingStatus, PaymentStatus, ShowSeatStatus } from "@prisma/client";

export class PrismaBookingRepository implements IBookingRepository {
  async findById(id: string): Promise<IBookingDetails | null> {
    return db.booking.findUnique({
      where: { id },
      include: {
        show: {
          include: {
            movie: true,
            screen: {
              include: {
                theatre: {
                  include: {
                    city: true,
                  },
                },
              },
            },
          },
        },
        showSeats: {
          include: {
            seat: true,
          },
        },
        payment: true,
      },
    }) as Promise<IBookingDetails | null>;
  }

  async createPendingBooking(
    userId: string,
    showId: string,
    seatIds: string[],
    totalPrice: number
  ): Promise<Booking> {
    return db.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId,
          showId,
          totalPrice,
          discountAmount: 0.00,
          finalAmount: totalPrice,
          status: BookingStatus.PENDING,
        },
      });

      await tx.showSeat.updateMany({
        where: {
          showId,
          seatId: { in: seatIds },
        },
        data: {
          bookingId: booking.id,
        },
      });

      return booking;
    });
  }

  async confirmBooking(
    bookingId: string,
    transactionId: string,
    gateway: string,
    amount: number
  ): Promise<boolean> {
    try {
      return await db.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking || booking.status === BookingStatus.CONFIRMED) {
          return false;
        }

        await tx.payment.create({
          data: {
            bookingId,
            transactionId,
            gateway,
            amount,
            status: PaymentStatus.SUCCESS,
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        await tx.showSeat.updateMany({
          where: { bookingId },
          data: {
            status: ShowSeatStatus.BOOKED,
          },
        });

        return true;
      });
    } catch (e) {
      console.error("PrismaBookingRepository.confirmBooking failed:", e);
      return false;
    }
  }

  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      return await db.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking || booking.status === BookingStatus.CANCELLED) {
          return false;
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED },
        });

        await tx.showSeat.updateMany({
          where: { bookingId },
          data: {
            status: ShowSeatStatus.AVAILABLE,
            bookingId: null,
          },
        });

        await tx.payment.updateMany({
          where: { bookingId },
          data: { status: PaymentStatus.REFUNDED },
        });

        return true;
      });
    } catch (e) {
      console.error("PrismaBookingRepository.cancelBooking failed:", e);
      return false;
    }
  }

  async findUserBookings(userId: string): Promise<IBookingDetails[]> {
    return db.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            movie: true,
            screen: {
              include: {
                theatre: {
                  include: {
                    city: true,
                  },
                },
              },
            },
          },
        },
        showSeats: {
          include: {
            seat: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<IBookingDetails[]>;
  }
}
