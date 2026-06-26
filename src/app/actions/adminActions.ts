"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SeatType, ShowSeatStatus, Role } from "@prisma/client";
import { auth } from "@/auth";

export async function createTheatreAction(name: string, city: string, address: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  // Double check role
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.THEATRE_OWNER) {
    return { error: "Permission denied" };
  }

  const ownerId = session.user.id;

  try {
    return await db.$transaction(async (tx) => {
      // 1. Get or create City
      const cityRecord = await tx.city.upsert({
        where: {
          name_state_country: {
            name: city,
            state: "MH",
            country: "India",
          },
        },
        update: {},
        create: {
          name: city,
          state: "MH",
          country: "India",
        },
      });

      // 2. Create Theatre
      const theatre = await tx.theatre.create({
        data: {
          name,
          cityId: cityRecord.id,
          address,
          ownerId,
        },
      });

      // 3. Create Screen
      const screen = await tx.screen.create({
        data: {
          name: "Screen 1",
          theatreId: theatre.id,
          rowsCount: 5,
          colsCount: 8,
          seatLayout: JSON.stringify({ rows: 5, cols: 8 }),
        },
      });

      // 4. Create Seats (5 rows A-E, 8 seats per row = 40 seats)
      const rows = ["A", "B", "C", "D", "E"];
      const seatData = [];
      for (const row of rows) {
        for (let num = 1; num <= 8; num++) {
          const type = (row === "A" || row === "B") ? SeatType.PREMIUM : SeatType.NORMAL;
          seatData.push({
            screenId: screen.id,
            row,
            number: num,
            label: `${row}-${num}`,
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
      // 1. Fetch movie to get its languages
      const movie = await tx.movie.findUnique({
        where: { id: movieId },
        include: { languages: true },
      });

      if (!movie) {
        throw new Error("Movie not found");
      }

      // Find or create a default language if movie has no language associated
      let languageId = movie.languages[0]?.languageId;
      if (!languageId) {
        const defaultLang = await tx.language.upsert({
          where: { name: "English" },
          update: {},
          create: { name: "English", code: "en" },
        });
        languageId = defaultLang.id;
      }

      // 2. Create Show
      const show = await tx.show.create({
        data: {
          movieId,
          screenId,
          startTime,
          endTime,
          basePrice,
          languageId,
        },
      });

      // 3. Fetch seats
      const seats = await tx.seat.findMany({
        where: { screenId },
      });

      // 4. Create Show Seats
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
      include: { screens: true, city: true },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("getTheatresAction failed:", e);
    return [];
  }
}
