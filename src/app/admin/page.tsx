import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { AdminDashboard } from "@/components/domains/AdminDashboard";
import { getMoviesAction } from "@/app/actions/movieActions";
import { getOwnerTheatresAction, getPendingTheatresAction } from "@/app/actions/theatreActions";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;

  if (role !== Role.ADMIN && role !== Role.THEATRE_OWNER) {
    redirect("/");
  }

  // Fetch data in parallel
  const [movies, ownerTheatres, pendingTheatres, languages] = await Promise.all([
    getMoviesAction(),
    role === Role.THEATRE_OWNER ? getOwnerTheatresAction() : db.theatre.findMany({
      include: {
        screens: {
          include: {
            shows: { include: { movie: true } },
          },
        },
        city: true,
      },
      orderBy: { name: "asc" },
    }),
    role === Role.ADMIN ? getPendingTheatresAction() : Promise.resolve([]),
    db.language.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Format theatres for client serialization safely
  const formattedTheatres = ownerTheatres.map((t) => ({
    id: t.id,
    name: t.name,
    address: t.address,
    approved: t.approved,
    city: t.city,
    contactPhone: t.contactPhone,
    contactEmail: t.contactEmail,
    screens: t.screens.map((s) => ({
      id: s.id,
      name: s.name,
      rowsCount: s.rowsCount,
      colsCount: s.colsCount,
      seatLayout: s.seatLayout,
      shows: s.shows.map((show) => ({
        id: show.id,
        movieId: show.movieId,
        startTime: show.startTime,
        endTime: show.endTime,
        format: show.format,
        basePrice: Number(show.basePrice),
        movie: {
          title: show.movie.title,
        },
      })),
    })),
  }));

  const formattedPendingTheatres = pendingTheatres.map((t) => ({
    id: t.id,
    name: t.name,
    address: t.address,
    city: t.city,
    contactPhone: t.contactPhone,
    contactEmail: t.contactEmail,
    owner: t.owner,
  }));

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] py-12 transition-colors duration-200">
        <AdminDashboard
          initialMovies={movies}
          initialTheatres={formattedTheatres}
          initialPendingTheatres={formattedPendingTheatres}
          languages={languages}
          role={role}
        />
      </main>
      <Footer />
    </>
  );
}
