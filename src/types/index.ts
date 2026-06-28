import { Movie, Genre, Language, Actor, Director, Review, User, ShowFormat } from "@prisma/client";

export interface IMovieWithRelations extends Movie {
  genres: {
    movieId: string;
    genreId: string;
    genre: Genre;
  }[];
  languages: {
    movieId: string;
    languageId: string;
    language: Language;
  }[];
}

export interface IMovieDetails extends IMovieWithRelations {
  actors: {
    movieId: string;
    actorId: string;
    characterName: string;
    actor: Actor;
  }[];
  directors: {
    movieId: string;
    directorId: string;
    director: Director;
  }[];
  reviews: (Review & {
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  })[];
}

export interface MovieDiscoveryFilters {
  city?: string;
  search?: string;
  genres?: string[];
  languages?: string[];
  formats?: ShowFormat[];
  rating?: number;
  theatreId?: string;
  status?: "now-showing" | "coming-soon" | "all";
  sortBy?: "rating" | "releaseDate" | "duration";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

