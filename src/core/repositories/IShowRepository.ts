import { Show, ShowSeat, Seat, Movie, Screen, Theatre } from "@prisma/client";

export interface IShowDetails extends Show {
  movie: Movie;
  screen: Screen & {
    theatre: Theatre;
  };
}

export interface IShowSeatDetails extends ShowSeat {
  seat: Seat;
}

export interface IShowRepository {
  findById(id: string): Promise<IShowDetails | null>;
  findSeatsByShowId(showId: string): Promise<IShowSeatDetails[]>;
  findShowsByMovieAndCity(movieId: string, city: string, date: Date): Promise<any[]>;
  lockSeats(showId: string, seatIds: string[], userId: string, lockTtlSeconds: number): Promise<boolean>;
  unlockSeats(showId: string, seatIds: string[], userId: string): Promise<boolean>;
}
