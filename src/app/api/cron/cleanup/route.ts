import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BookingStatus, ShowSeatStatus } from "@prisma/client";
import { logger } from "@/utils/logger";

async function runCleanup() {
  const expiryTime = new Date(Date.now() - 8 * 60 * 1000); // 8 minutes ago

  // Query pending bookings older than 8 minutes
  const expiredBookings = await db.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      createdAt: {
        lt: expiryTime,
      },
    },
    include: {
      showSeats: true,
    },
  });

  if (expiredBookings.length === 0) {
    return { processed: 0, expiredBookingIds: [] };
  }

  const processedIds: string[] = [];

  // Revert seat states and mark booking as EXPIRED in a transaction
  await db.$transaction(async (tx) => {
    for (const booking of expiredBookings) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.EXPIRED },
      });

      await tx.showSeat.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: ShowSeatStatus.AVAILABLE,
          bookingId: null,
        },
      });

      processedIds.push(booking.id);
    }
  });

  logger.info("Expired bookings cleanup completed successfully", {
    count: processedIds.length,
    bookingIds: processedIds,
  });

  return { processed: processedIds.length, expiredBookingIds: processedIds };
}

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is configured, enforce Bearer token validation.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runCleanup();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    logger.error("GET cleanup cron failed", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runCleanup();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    logger.error("POST cleanup cron failed", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
