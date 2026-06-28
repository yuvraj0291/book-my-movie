"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SeatType, ShowSeatStatus, Role, ShowFormat } from "@prisma/client";
import { auth } from "@/auth";

// ==========================================
// 1. THEATRE CRUD ACTIONS
// ==========================================

export async function createTheatreAction(data: {
  name: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  contactEmail?: string;
}) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  if (session.user.role !== Role.ADMIN && session.user.role !== Role.THEATRE_OWNER) {
    return { error: "Permission denied. Only Admins and Theatre Owners can create theatres." };
  }

  const ownerId = session.user.id;

  try {
    return await db.$transaction(async (tx) => {
      // 1. Get or create City
      const cityRecord = await tx.city.upsert({
        where: {
          name_state_country: {
            name: data.city,
            state: "MH",
            country: "India",
          },
        },
        update: {},
        create: {
          name: data.city,
          state: "MH",
          country: "India",
        },
      });

      // 2. Create Theatre (Default approved is false for Theatre Owners, true for Admins)
      const isApproved = session.user.role === Role.ADMIN;

      const theatre = await tx.theatre.create({
        data: {
          name: data.name,
          cityId: cityRecord.id,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          approved: isApproved,
          ownerId,
        },
      });

      // 3. Create a default Screen 1 with a standard layout
      const screen = await tx.screen.create({
        data: {
          name: "Screen 1",
          theatreId: theatre.id,
          rowsCount: 5,
          colsCount: 8,
          seatLayout: JSON.stringify({
            rows: 5,
            cols: 8,
            grid: Array.from({ length: 5 }, (_, r) =>
              Array.from({ length: 8 }, (_, c) => ({
                row: String.fromCharCode(65 + r), // A, B, C...
                number: c + 1,
                type: r < 2 ? "PREMIUM" : "NORMAL",
                active: true,
              }))
            ),
          }),
        },
      });

      // 4. Populate default seats
      const seatData = [];
      for (let r = 0; r < 5; r++) {
        const row = String.fromCharCode(65 + r);
        for (let num = 1; num <= 8; num++) {
          const type = r < 2 ? SeatType.PREMIUM : SeatType.NORMAL;
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

      revalidatePath("/");
      return { success: true, theatreId: theatre.id, approved: isApproved };
    });
  } catch (e) {
    console.error("createTheatreAction failed:", e);
    return { error: "Failed to create theatre" };
  }
}

export async function updateTheatreAction(
  id: string,
  data: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    contactPhone?: string;
    contactEmail?: string;
  }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const theatre = await db.theatre.findUnique({ where: { id } });
    if (!theatre) return { error: "Theatre not found" };

    if (theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    await db.theatre.update({
      where: { id },
      data,
    });

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("updateTheatreAction failed:", e);
    return { error: "Failed to update theatre" };
  }
}

export async function deleteTheatreAction(id: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const theatre = await db.theatre.findUnique({ where: { id } });
    if (!theatre) return { error: "Theatre not found" };

    if (theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    await db.theatre.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("deleteTheatreAction failed:", e);
    return { error: "Failed to delete theatre" };
  }
}

export async function getOwnerTheatresAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return [];
  }

  try {
    return await db.theatre.findMany({
      where: { ownerId: session.user.id },
      include: {
        screens: {
          include: {
            shows: {
              include: { movie: true },
            },
          },
        },
        city: true,
      },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("getOwnerTheatresAction failed:", e);
    return [];
  }
}

export async function getPendingTheatresAction() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.ADMIN) {
    return [];
  }

  try {
    return await db.theatre.findMany({
      where: { approved: false },
      include: {
        owner: {
          select: { name: true, email: true },
        },
        city: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("getPendingTheatresAction failed:", e);
    return [];
  }
}

export async function approveTheatreAction(id: string, approved: boolean) {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.ADMIN) {
    return { error: "Permission denied" };
  }

  try {
    await db.theatre.update({
      where: { id },
      data: { approved },
    });
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("approveTheatreAction failed:", e);
    return { error: "Failed to update theatre approval status" };
  }
}

// ==========================================
// 2. SCREEN & LAYOUT ACTIONS
// ==========================================

export async function createScreenAction(theatreId: string, name: string, rows: number, cols: number) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const theatre = await db.theatre.findUnique({ where: { id: theatreId } });
    if (!theatre) return { error: "Theatre not found" };

    if (theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    // Default layout grid
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: String.fromCharCode(65 + r),
        number: c + 1,
        type: "NORMAL",
        active: true,
      }))
    );

    return await db.$transaction(async (tx) => {
      const screen = await tx.screen.create({
        data: {
          name,
          theatreId,
          rowsCount: rows,
          colsCount: cols,
          seatLayout: JSON.stringify({ rows, cols, grid }),
        },
      });

      // Generate seats
      const seatData = [];
      for (let r = 0; r < rows; r++) {
        const row = String.fromCharCode(65 + r);
        for (let c = 1; c <= cols; c++) {
          seatData.push({
            screenId: screen.id,
            row,
            number: c,
            label: `${row}-${c}`,
            type: SeatType.NORMAL,
          });
        }
      }

      await tx.seat.createMany({ data: seatData });
      revalidatePath("/");
      return { success: true, screenId: screen.id };
    });
  } catch (e) {
    console.error("createScreenAction failed:", e);
    return { error: "Failed to create screen" };
  }
}

export async function saveScreenLayoutAction(
  screenId: string,
  rows: number,
  cols: number,
  layoutJson: string
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const screen = await db.screen.findUnique({
      where: { id: screenId },
      include: { theatre: true },
    });

    if (!screen) return { error: "Screen not found" };

    if (screen.theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    const layout = JSON.parse(layoutJson);
    const grid = layout.grid; // Array of rows, each containing seat cells

    return await db.$transaction(async (tx) => {
      // 1. Delete all existing seats (Cascades and handles dependencies)
      // Note: If there are existing bookings/shows on this screen, we might block this edit.
      const activeShows = await tx.show.findMany({
        where: { screenId, startTime: { gte: new Date() } },
      });

      if (activeShows.length > 0) {
        throw new Error(
          "Cannot edit seat layout. There are active shows scheduled on this screen. Cancel them first."
        );
      }

      await tx.seat.deleteMany({
        where: { screenId },
      });

      // 2. Update Screen layout info
      await tx.screen.update({
        where: { id: screenId },
        data: {
          rowsCount: rows,
          colsCount: cols,
          seatLayout: layoutJson,
        },
      });

      // 3. Create new seats matching the layout grid
      const seatsToCreate: any[] = [];
      grid.forEach((rowArray: any[]) => {
        rowArray.forEach((cell: any) => {
          if (cell && cell.active) {
            seatsToCreate.push({
              screenId,
              row: cell.row,
              number: cell.number,
              label: `${cell.row}-${cell.number}`,
              type: cell.type as SeatType,
            });
          }
        });
      });

      if (seatsToCreate.length > 0) {
        await tx.seat.createMany({
          data: seatsToCreate,
        });
      }

      revalidatePath("/");
      return { success: true };
    });
  } catch (e: any) {
    console.error("saveScreenLayoutAction failed:", e);
    return { error: e.message || "Failed to save seat layout" };
  }
}

export async function deleteScreenAction(id: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const screen = await db.screen.findUnique({
      where: { id },
      include: { theatre: true },
    });

    if (!screen) return { error: "Screen not found" };

    if (screen.theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    const activeShows = await db.show.findMany({
      where: { screenId: id, startTime: { gte: new Date() } },
    });

    if (activeShows.length > 0) {
      return { error: "Cannot delete screen with active upcoming shows." };
    }

    await db.screen.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("deleteScreenAction failed:", e);
    return { error: "Failed to delete screen" };
  }
}

// ==========================================
// 3. SHOW SCHEDULING & CONFLICT ACTIONS
// ==========================================

export async function scheduleShowWithConflictCheckAction(data: {
  movieId: string;
  screenId: string;
  startTimeString: string;
  format: ShowFormat;
  languageId: string;
  subtitleLanguageId: string | null;
  basePrice: number;
}) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const screen = await db.screen.findUnique({
      where: { id: data.screenId },
      include: { theatre: true },
    });

    if (!screen) return { error: "Screen not found" };

    // Check ownership
    if (screen.theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    // Ensure theatre is approved
    if (!screen.theatre.approved) {
      return { error: "Your theatre must be approved by an Admin before scheduling shows." };
    }

    const movie = await db.movie.findUnique({ where: { id: data.movieId } });
    if (!movie) return { error: "Movie not found" };

    const startTime = new Date(data.startTimeString);
    // End time is start + movie duration + 30 minute buffer
    const durationMs = movie.durationMins * 60 * 1000;
    const bufferMs = 30 * 60 * 1000; // 30 mins buffer
    const endTime = new Date(startTime.getTime() + durationMs);

    // Conflict Window Check
    const checkStart = new Date(startTime.getTime() - bufferMs);
    const checkEnd = new Date(endTime.getTime() + bufferMs);

    return await db.$transaction(async (tx) => {
      // Find conflicting shows on the same screen
      const conflictingShows = await tx.show.findMany({
        where: {
          screenId: data.screenId,
          startTime: { lt: checkEnd },
          endTime: { gt: checkStart },
        },
        include: { movie: true },
      });

      if (conflictingShows.length > 0) {
        const conflict = conflictingShows[0];
        const conflictTime = new Date(conflict.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        throw new Error(
          `Time conflict: "${conflict.movie.title}" is scheduled at ${conflictTime} (includes 30-min buffer).`
        );
      }

      // Create Show
      const show = await tx.show.create({
        data: {
          movieId: data.movieId,
          screenId: data.screenId,
          startTime,
          endTime,
          format: data.format,
          languageId: data.languageId,
          subtitleLanguageId: data.subtitleLanguageId,
          basePrice: data.basePrice,
        },
      });

      // Fetch seats for this screen to generate ShowSeat pricing
      const seats = await tx.seat.findMany({
        where: { screenId: data.screenId },
      });

      // Price multipliers based on SeatType
      const multipliers: Record<SeatType, number> = {
        NORMAL: 1.0,
        PREMIUM: 1.2,
        VIP: 1.5,
        RECLINER: 1.8,
        COUPLE: 2.0,
        WHEELCHAIR: 0.8,
      };

      const showSeatsData = seats.map((seat) => {
        const multiplier = multipliers[seat.type] || 1.0;
        return {
          showId: show.id,
          seatId: seat.id,
          status: ShowSeatStatus.AVAILABLE,
          price: Number((data.basePrice * multiplier).toFixed(2)),
        };
      });

      await tx.showSeat.createMany({
        data: showSeatsData,
      });

      revalidatePath("/");
      return { success: true, showId: show.id };
    });
  } catch (e: any) {
    console.error("scheduleShowWithConflictCheckAction failed:", e);
    return { error: e.message || "Failed to schedule show" };
  }
}

export async function getShowStatsAction(showId: string) {
  try {
    const show = await db.show.findUnique({
      where: { id: showId },
      include: {
        movie: true,
        screen: { include: { theatre: true } },
        showSeats: true,
        bookings: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    if (!show) return null;

    const totalSeats = show.showSeats.length;
    const bookedSeats = show.showSeats.filter((s) => s.status === "BOOKED").length;
    const lockedSeats = show.showSeats.filter((s) => s.status === "AVAILABLE" && s.bookingId !== null).length; // held
    const availableSeats = totalSeats - bookedSeats - lockedSeats;

    const totalRevenue = show.bookings.reduce((sum, b) => sum + Number(b.finalAmount), 0);

    return {
      id: show.id,
      movieTitle: show.movie.title,
      screenName: show.screen.name,
      theatreName: show.screen.theatre.name,
      startTime: show.startTime,
      totalSeats,
      bookedSeats,
      lockedSeats,
      availableSeats,
      totalRevenue,
    };
  } catch (e) {
    console.error("getShowStatsAction failed:", e);
    return null;
  }
}

export async function cancelShowAction(showId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const show = await db.show.findUnique({
      where: { id: showId },
      include: { screen: { include: { theatre: true } } },
    });

    if (!show) return { error: "Show not found" };

    if (show.screen.theatre.ownerId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { error: "Permission denied" };
    }

    // Cancel show and release any bookings (in real life, refund payments)
    return await db.$transaction(async (tx) => {
      // Find bookings
      const bookings = await tx.booking.findMany({
        where: { showId, status: { in: ["PENDING", "CONFIRMED"] } },
      });

      // Update bookings to CANCELLED
      if (bookings.length > 0) {
        await tx.booking.updateMany({
          where: { showId, status: { in: ["PENDING", "CONFIRMED"] } },
          data: { status: "CANCELLED" },
        });

        // Mark payments as failed or pending refund
        const bookingIds = bookings.map((b) => b.id);
        await tx.payment.updateMany({
          where: { bookingId: { in: bookingIds } },
          data: { status: "FAILED" }, // or REFUNDED if we process refunds
        });
      }

      // Delete the show (deletes showSeats via cascade)
      await tx.show.delete({
        where: { id: showId },
      });

      return { success: true };
    });
  } catch (e) {
    console.error("cancelShowAction failed:", e);
    return { error: "Failed to cancel show" };
  }
}
