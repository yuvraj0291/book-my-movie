"use server";

import { PrismaShowRepository } from "@/infrastructure/db/PrismaShowRepository";

const showRepository = new PrismaShowRepository();

export async function getShowDetailsAction(showId: string) {
  try {
    const show = await showRepository.findById(showId);
    if (!show) return null;
    return {
      id: show.id,
      movieId: show.movieId,
      screenId: show.screenId,
      startTime: show.startTime,
      endTime: show.endTime,
      basePrice: Number(show.basePrice),
      movie: show.movie,
      screen: show.screen,
    };
  } catch (e) {
    console.error("getShowDetailsAction failed:", e);
    return null;
  }
}

export async function getShowSeatsAction(showId: string) {
  try {
    const seats = await showRepository.findSeatsByShowId(showId);
    return seats.map(s => ({
      id: s.id,
      showId: s.showId,
      seatId: s.seatId,
      bookingId: s.bookingId,
      status: s.status,
      lockedAt: s.lockedAt,
      lockedByUserId: s.lockedByUserId,
      price: Number(s.price),
      seat: s.seat,
    }));
  } catch (e) {
    console.error("getShowSeatsAction failed:", e);
    return [];
  }
}

export async function getShowsByMovieAndCityAction(movieId: string, city: string, dateString: string) {
  try {
    const date = new Date(dateString);
    return await showRepository.findShowsByMovieAndCity(movieId, city, date);
  } catch (e) {
    console.error("getShowsByMovieAndCityAction failed:", e);
    return [];
  }
}
