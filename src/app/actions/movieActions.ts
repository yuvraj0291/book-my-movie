"use server";

import { db } from "@/lib/db";
import { PrismaMovieRepository } from "@/infrastructure/db/PrismaMovieRepository";
import { Movie } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { IMovieWithRelations, IMovieDetails, MovieDiscoveryFilters } from "@/types";
import { auth } from "@/auth";

const movieRepository = new PrismaMovieRepository();

export async function getMoviesAction(): Promise<IMovieWithRelations[]> {
  try {
    return await movieRepository.findAllActive();
  } catch (e) {
    console.error("getMoviesAction failed:", e);
    return [];
  }
}

export async function getMovieByIdAction(id: string): Promise<IMovieDetails | null> {
  try {
    return await movieRepository.findDetailsById(id);
  } catch (e) {
    console.error(`getMovieByIdAction failed for ${id}:`, e);
    return null;
  }
}

export async function getDiscoveryMoviesAction(filters: MovieDiscoveryFilters) {
  try {
    return await movieRepository.findDiscoveryMovies(filters);
  } catch (e) {
    console.error("getDiscoveryMoviesAction failed:", e);
    return { movies: [], total: 0 };
  }
}

export async function getMovieRecommendationsAction(movieId: string): Promise<IMovieWithRelations[]> {
  try {
    return await movieRepository.findRecommendations(movieId);
  } catch (e) {
    console.error(`getMovieRecommendationsAction failed for ${movieId}:`, e);
    return [];
  }
}

export async function getMovieSuggestionsAction(query: string, city?: string) {
  if (!query || query.trim().length < 2) return [];

  try {
    const where: any = {
      title: { contains: query.trim(), mode: "insensitive" },
    };

    if (city) {
      where.shows = {
        some: {
          screen: {
            theatre: {
              city: { name: { equals: city, mode: "insensitive" } },
            },
          },
        },
      };
    }

    const movies = await db.movie.findMany({
      where,
      take: 5,
      include: {
        genres: { include: { genre: true } },
      },
    });

    return movies.map((m) => ({
      id: m.id,
      title: m.title,
      posterUrl: m.posterUrl,
      rating: m.rating,
      genres: m.genres.map((g) => g.genre.name),
    }));
  } catch (e) {
    console.error("getMovieSuggestionsAction failed:", e);
    return [];
  }
}

export async function addMovieReviewAction(movieId: string, rating: number, content: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "You must be logged in to write a review" };
  }

  if (rating < 1 || rating > 10) {
    return { error: "Rating must be between 1 and 10" };
  }

  const userId = session.user.id;

  try {
    // 1. Create review
    await db.review.create({
      data: {
        userId,
        movieId,
        rating,
        content,
      },
    });

    // 2. Recalculate movie average rating
    const aggregate = await db.review.aggregate({
      where: { movieId },
      _avg: {
        rating: true,
      },
    });

    const newAvgRating = aggregate._avg.rating || 0;

    await db.movie.update({
      where: { id: movieId },
      data: { rating: Number(newAvgRating.toFixed(1)) },
    });

    revalidatePath(`/movie/${movieId}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("addMovieReviewAction failed:", e);
    return { error: "Failed to submit review" };
  }
}

export async function deleteMovieReviewAction(reviewId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { error: "Review not found" };
    }

    if (review.userId !== session.user.id && session.user.role !== "ADMIN") {
      return { error: "You are not authorized to delete this review" };
    }

    const movieId = review.movieId;

    // 1. Delete review
    await db.review.delete({
      where: { id: reviewId },
    });

    // 2. Recalculate average rating
    const aggregate = await db.review.aggregate({
      where: { movieId },
      _avg: {
        rating: true,
      },
    });

    const newAvgRating = aggregate._avg.rating || 0;

    await db.movie.update({
      where: { id: movieId },
      data: { rating: Number(newAvgRating.toFixed(1)) },
    });

    revalidatePath(`/movie/${movieId}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("deleteMovieReviewAction failed:", e);
    return { error: "Failed to delete review" };
  }
}

export async function getFilterOptionsAction(city?: string) {
  try {
    const [genres, languages] = await Promise.all([
      db.genre.findMany({ orderBy: { name: "asc" } }),
      db.language.findMany({ orderBy: { name: "asc" } }),
    ]);

    let theatres: any[] = [];
    if (city) {
      theatres = await db.theatre.findMany({
        where: {
          city: { name: { equals: city, mode: "insensitive" } },
        },
        orderBy: { name: "asc" },
      });
    }

    return {
      genres: genres.map((g) => g.name),
      languages: languages.map((l) => l.name),
      theatres: theatres.map((t) => ({ id: t.id, name: t.name })),
    };
  } catch (e) {
    console.error("getFilterOptionsAction failed:", e);
    return { genres: [], languages: [], theatres: [] };
  }
}

export async function createMovieAction(data: {
  title: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  durationMins: number;
  language: string;
  genre: string;
  releaseDate: Date;
  rating: number;
}) {
  try {
    const genres = data.genre.split(",").map((g) => g.trim()).filter(Boolean);
    const languages = data.language.split(",").map((l) => l.trim()).filter(Boolean);

    const movie = await movieRepository.create({
      title: data.title,
      description: data.description,
      posterUrl: data.posterUrl,
      bannerUrl: data.bannerUrl,
      durationMins: data.durationMins,
      genres,
      languages,
      releaseDate: data.releaseDate,
      rating: data.rating,
    });
    const movieWithRelations = await movieRepository.findById(movie.id);
    revalidatePath("/");
    return { success: true, movie: movieWithRelations };
  } catch (e) {
    console.error("createMovieAction failed:", e);
    return { error: "Failed to create movie" };
  }
}

export async function getCitiesAction() {
  try {
    return await db.city.findMany({
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("getCitiesAction failed:", e);
    return [];
  }
}

export async function toggleFavoriteAction(movieId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "You must be logged in to favorite a movie" };
  }

  const userId = session.user.id;

  try {
    const existing = await db.favorite.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (existing) {
      await db.favorite.delete({
        where: {
          userId_movieId: { userId, movieId },
        },
      });
      revalidatePath(`/movie/${movieId}`);
      return { success: true, isFavorite: false };
    } else {
      await db.favorite.create({
        data: { userId, movieId },
      });
      revalidatePath(`/movie/${movieId}`);
      return { success: true, isFavorite: true };
    }
  } catch (e) {
    console.error("toggleFavoriteAction failed:", e);
    return { error: "Failed to toggle favorite" };
  }
}

export async function checkIsFavoriteAction(movieId: string): Promise<boolean> {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return false;
  }

  try {
    const fav = await db.favorite.findUnique({
      where: {
        userId_movieId: { userId: session.user.id, movieId },
      },
    });
    return !!fav;
  } catch (e) {
    console.error("checkIsFavoriteAction failed:", e);
    return false;
  }
}



