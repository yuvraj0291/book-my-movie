"use server";

import { db } from "@/lib/db";
import { PrismaMovieRepository } from "@/infrastructure/db/PrismaMovieRepository";
import { Movie } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { IMovieWithRelations } from "@/types";

const movieRepository = new PrismaMovieRepository();

export async function getMoviesAction(): Promise<IMovieWithRelations[]> {
  try {
    return await movieRepository.findAllActive();
  } catch (e) {
    console.error("getMoviesAction failed:", e);
    return [];
  }
}

export async function getMovieByIdAction(id: string): Promise<IMovieWithRelations | null> {
  try {
    return await movieRepository.findById(id);
  } catch (e) {
    console.error(`getMovieByIdAction failed for ${id}:`, e);
    return null;
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
