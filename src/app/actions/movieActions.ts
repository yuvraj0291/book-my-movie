"use server";

import { db } from "@/lib/db";
import { PrismaMovieRepository } from "@/infrastructure/db/PrismaMovieRepository";
import { Movie } from "@prisma/client";
import { revalidatePath } from "next/cache";

const movieRepository = new PrismaMovieRepository();

export async function getMoviesAction(): Promise<Movie[]> {
  try {
    return await movieRepository.findAllActive();
  } catch (e) {
    console.error("getMoviesAction failed:", e);
    return [];
  }
}

export async function getMovieByIdAction(id: string): Promise<Movie | null> {
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
    const movie = await movieRepository.create(data);
    revalidatePath("/");
    return { success: true, movie };
  } catch (e) {
    console.error("createMovieAction failed:", e);
    return { error: "Failed to create movie" };
  }
}
