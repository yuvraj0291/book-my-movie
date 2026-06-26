import { IMovieRepository } from "@/core/repositories/IMovieRepository";
import { db } from "@/lib/db";
import { Movie } from "@prisma/client";
import { IMovieWithRelations } from "@/types";

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
