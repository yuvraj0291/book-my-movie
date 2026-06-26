import { IMovieRepository } from "@/core/repositories/IMovieRepository";
import { db } from "@/lib/db";
import { Movie } from "@prisma/client";

export class PrismaMovieRepository implements IMovieRepository {
  async findById(id: string): Promise<Movie | null> {
    return db.movie.findUnique({
      where: { id },
    });
  }

  async findAllActive(): Promise<Movie[]> {
    return db.movie.findMany({
      orderBy: { releaseDate: "desc" },
    });
  }

  async create(data: Omit<Movie, "id" | "createdAt" | "updatedAt">): Promise<Movie> {
    return db.movie.create({
      data,
    });
  }
}
