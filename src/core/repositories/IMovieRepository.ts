import { Movie } from "@prisma/client";

export interface IMovieRepository {
  findById(id: string): Promise<Movie | null>;
  findAllActive(): Promise<Movie[]>;
  create(data: Omit<Movie, "id" | "createdAt" | "updatedAt">): Promise<Movie>;
}
