"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SeatType, ShowSeatStatus } from "@prisma/client";

export async function createTheatreAction(name: string, city: string, address: string) {
  try {
    return await db.$transaction(async (tx) => {
      const theatre = await tx.theatre.create({
        data: { name, city, address },
      });

      const screen = await tx.screen.create({
        data: { name: "Screen 1", theatreId: theatre.id },
      });

      const rows = ["A", "B", "C", "D", "E"];
      const seatData = [];
      for (const row of rows) {
        for (let num = 1; num <= 8; num++) {
          const type = (row === "A" || row === "B") ? SeatType.PREMIUM : SeatType.NORMAL;
          seatData.push({
            screenId: screen.id,
            row,
            number: num,
            type,
          });
        }
      }

      await tx.seat.createMany({
        data: seatData,
      });

      return { success: true, theatreId: theatre.id };
    });
  } catch (e) {
    console.error("createTheatreAction failed:", e);
    return { error: "Failed to create theatre and default seat map" };
  }
}

export async function scheduleShowAction(
  movieId: string,
  screenId: string,
  startTimeString: string,
  basePrice: number
) {
  try {
    const startTime = new Date(startTimeString);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);

    return await db.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          movieId,
          screenId,
          startTime,
          endTime,
          basePrice,
        },
      });

      const seats = await tx.seat.findMany({
        where: { screenId },
      });

      const showSeatsData = seats.map((seat) => {
        let priceMultiplier = 1.0;
        if (seat.type === SeatType.PREMIUM) priceMultiplier = 1.2;
        if (seat.type === SeatType.VIP) priceMultiplier = 1.5;

        return {
          showId: show.id,
          seatId: seat.id,
          status: ShowSeatStatus.AVAILABLE,
          price: basePrice * priceMultiplier,
        };
      });

      await tx.showSeat.createMany({
        data: showSeatsData,
      });

      revalidatePath("/");
      return { success: true, showId: show.id };
    });
  } catch (e) {
    console.error("scheduleShowAction failed:", e);
    return { error: "Failed to schedule show" };
  }
}

export async function getTheatresAction() {
  try {
    return await db.theatre.findMany({
      include: { screens: true },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("getTheatresAction failed:", e);
    return [];
  }
}
