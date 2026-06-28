import { IMovieRepository } from "@/core/repositories/IMovieRepository";
import { db } from "@/lib/db";
import { Movie, ShowFormat } from "@prisma/client";
import { IMovieWithRelations, IMovieDetails, MovieDiscoveryFilters } from "@/types";

export class PrismaMovieRepository implements IMovieRepository {
  async findById(id: string): Promise<IMovieWithRelations | null> {
    return db.movie.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
      },
    }) as Promise<IMovieWithRelations | null>;
  }

  async findDetailsById(id: string): Promise<IMovieDetails | null> {
    return db.movie.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
        actors: { include: { actor: true } },
        directors: { include: { director: true } },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }) as Promise<IMovieDetails | null>;
  }

  async findDiscoveryMovies(filters: MovieDiscoveryFilters): Promise<{ movies: IMovieWithRelations[]; total: number }> {
    const {
      city,
      search,
      genres,
      languages,
      formats,
      rating,
      theatreId,
      status,
      sortBy = "releaseDate",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (genres && genres.length > 0) {
      where.genres = {
        some: {
          genre: {
            name: { in: genres },
          },
        },
      };
    }

    if (languages && languages.length > 0) {
      where.languages = {
        some: {
          language: {
            name: { in: languages },
          },
        },
      };
    }

    const now = new Date();
    if (status === "now-showing") {
      where.releaseDate = { lte: now };
    } else if (status === "coming-soon") {
      where.releaseDate = { gt: now };
    }

    if (rating) {
      where.rating = { gte: rating };
    }

    if (city || theatreId || (formats && formats.length > 0)) {
      const showWhere: any = {};

      if (city) {
        showWhere.screen = {
          theatre: {
            city: {
              name: { equals: city, mode: "insensitive" },
            },
          },
        };
      }

      if (theatreId) {
        showWhere.screen = {
          ...showWhere.screen,
          theatreId: theatreId,
        };
      }

      if (formats && formats.length > 0) {
        showWhere.format = { in: formats };
      }

      where.shows = {
        some: showWhere,
      };
    }

    const orderBy: any = {};
    if (sortBy === "rating") {
      orderBy.rating = sortOrder;
    } else if (sortBy === "releaseDate") {
      orderBy.releaseDate = sortOrder;
    } else if (sortBy === "duration") {
      orderBy.durationMins = sortOrder;
    } else {
      orderBy.releaseDate = "desc";
    }

    const [movies, total] = await Promise.all([
      db.movie.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          genres: { include: { genre: true } },
          languages: { include: { language: true } },
        },
      }),
      db.movie.count({ where }),
    ]);

    return { movies: movies as IMovieWithRelations[], total };
  }

  async findRecommendations(movieId: string): Promise<IMovieWithRelations[]> {
    const movie = await db.movie.findUnique({
      where: { id: movieId },
      include: { genres: true },
    });

    if (!movie) return [];

    const genreIds = movie.genres.map((g) => g.genreId);

    return db.movie.findMany({
      where: {
        id: { not: movieId },
        genres: {
          some: {
            genreId: { in: genreIds },
          },
        },
      },
      orderBy: { rating: "desc" },
      take: 5,
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
      },
    }) as Promise<IMovieWithRelations[]>;
  }

  async findAllActive(): Promise<IMovieWithRelations[]> {
    return db.movie.findMany({
      orderBy: { releaseDate: "desc" },
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
      },
    }) as Promise<IMovieWithRelations[]>;
  }


  async create(data: {
    title: string;
    description: string;
    posterUrl: string;
    bannerUrl: string;
    durationMins: number;
    genres: string[];
    languages: string[];
    releaseDate: Date;
    rating: number;
  }): Promise<Movie> {
    return db.$transaction(async (tx) => {
      const genreRecords = await Promise.all(
        data.genres.map(async (genreName) => {
          return tx.genre.upsert({
            where: { name: genreName },
            update: {},
            create: { name: genreName },
          });
        })
      );

      const languageRecords = await Promise.all(
        data.languages.map(async (langName) => {
          const code = langName.substring(0, 2).toLowerCase();
          return tx.language.upsert({
            where: { name: langName },
            update: {},
            create: { name: langName, code },
          });
        })
      );

      const movie = await tx.movie.create({
        data: {
          title: data.title,
          description: data.description,
          posterUrl: data.posterUrl,
          bannerUrl: data.bannerUrl,
          durationMins: data.durationMins,
          releaseDate: data.releaseDate,
          rating: data.rating,
        },
      });

      await tx.movieGenre.createMany({
        data: genreRecords.map((g) => ({
          movieId: movie.id,
          genreId: g.id,
        })),
      });

      await tx.movieLanguage.createMany({
        data: languageRecords.map((l) => ({
          movieId: movie.id,
          languageId: l.id,
        })),
      });

      return movie;
    });
  }
}
