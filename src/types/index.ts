export enum Role {
  USER = "USER",
  THEATRE_OWNER = "THEATRE_OWNER",
  ADMIN = "ADMIN",
}

export enum ShowFormat {
  TWO_D = "TWO_D",
  THREE_D = "THREE_D",
  IMAX = "IMAX",
  FOUR_DX = "FOUR_DX",
}

export enum SeatType {
  NORMAL = "NORMAL",
  PREMIUM = "PREMIUM",
  VIP = "VIP",
  RECLINER = "RECLINER",
  COUPLE = "COUPLE",
  WHEELCHAIR = "WHEELCHAIR",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIAL_REFUND = "PARTIAL_REFUND",
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  durationMins: number;
  releaseDate: Date;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Genre {
  id: string;
  name: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
}

export interface Actor {
  id: string;
  name: string;
  profileImageUrl: string | null;
}

export interface Director {
  id: string;
  name: string;
  profileImageUrl: string | null;
}

export interface Review {
  id: string;
  userId: string;
  movieId: string;
  rating: number;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
