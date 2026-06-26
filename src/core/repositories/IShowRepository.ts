import { Show, ShowSeat, Seat, Movie, Screen, Theatre, City } from "@prisma/client";

export interface IShowDetails extends Show {
  movie: Movie;
  screen: Screen & {
    theatre: Theatre & {
      city: City;
    };
  };
}

export interface IShowSeatDetails extends ShowSeat {
  seat: Seat;
}

export interface IShowRepository {
  findById(id: string): Promise<IShowDetails | null>;
  findSeatsByShowId(showId: string): Promise<IShowSeatDetails[]>;
  findShowsByMovieAndCity(movieId: string, city: string, date: Date): Promise<any[]>;
}
