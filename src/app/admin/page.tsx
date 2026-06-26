import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { AdminDashboard } from "@/components/domains/AdminDashboard";
import { getMoviesAction } from "@/app/actions/movieActions";
import { getTheatresAction } from "@/app/actions/adminActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function AdminPage() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const movies = await getMoviesAction();
  const theatres = await getTheatresAction();

  // Convert Decimals to numbers or shapes suitable for client component serialization
  const formattedTheatres = theatres.map(t => ({
    id: t.id,
    name: t.name,
    city: t.city,
    screens: t.screens.map(s => ({
      id: s.id,
      name: s.name,
    })),
  }));

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-[#030712] py-12">
        <AdminDashboard initialMovies={movies} initialTheatres={formattedTheatres} />
      </main>
      <Footer />
    </>
  );
}
