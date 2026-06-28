import { Movie } from "@prisma/client";
import { IMovieWithRelations, IMovieDetails, MovieDiscoveryFilters } from "@/types";

export interface IMovieRepository {
  findById(id: string): Promise<IMovieWithRelations | null>;
  findDetailsById(id: string): Promise<IMovieDetails | null>;
  findAllActive(): Promise<IMovieWithRelations[]>;
  findDiscoveryMovies(filters: MovieDiscoveryFilters): Promise<{ movies: IMovieWithRelations[]; total: number }>;
  findRecommendations(movieId: string): Promise<IMovieWithRelations[]>;
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

