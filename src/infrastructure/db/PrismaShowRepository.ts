import { IShowDetails, IShowRepository, IShowSeatDetails } from "@/core/repositories/IShowRepository";
import { db } from "@/lib/db";

export class PrismaShowRepository implements IShowRepository {
  async findById(id: string): Promise<IShowDetails | null> {
    return db.show.findUnique({
      where: { id },
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
    }) as Promise<IShowDetails | null>;
  }

  async findSeatsByShowId(showId: string): Promise<IShowSeatDetails[]> {
    return db.showSeat.findMany({
      where: { showId },
      include: {
        seat: true,
      },
      orderBy: [
        { seat: { row: "asc" } },
        { seat: { number: "asc" } },
      ],
    }) as Promise<IShowSeatDetails[]>;
  }

  async findShowsByMovieAndCity(movieId: string, city: string, date: Date): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const shows = await db.show.findMany({
      where: {
        movieId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        screen: {
          theatre: {
            city: {
              name: {
                equals: city,
                mode: "insensitive",
              },
            },
          },
        },
      },
      include: {
        screen: {
          include: {
            theatre: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const theatresMap: { [key: string]: any } = {};
    for (const show of shows) {
      const theatre = show.screen.theatre;
      if (!theatresMap[theatre.id]) {
        theatresMap[theatre.id] = {
          id: theatre.id,
          name: theatre.name,
          address: theatre.address,
          shows: [],
        };
      }
      theatresMap[theatre.id].shows.push({
        id: show.id,
        startTime: show.startTime,
        endTime: show.endTime,
        basePrice: Number(show.basePrice),
        screenName: show.screen.name,
      });
    }

    return Object.values(theatresMap);
  }
}
