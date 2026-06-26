import { Movie, Genre, Language } from "@prisma/client";

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
