import { Movie } from "@prisma/client";
import { IMovieWithRelations } from "@/types";

export interface IMovieRepository {
  findById(id: string): Promise<IMovieWithRelations | null>;
  findAllActive(): Promise<IMovieWithRelations[]>;
  create(data: {
    title: string;
    description: string;
    posterUrl: string;
    bannerUrl: string;
    durationMins: number;
    genres: string[];
    languages: string[];
    releaseDate: Date;
    rating: number;
  }): Promise<Movie>;
}
