import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getShowDetailsAction, getShowSeatsAction } from "@/app/actions/showActions";
import { SeatSelectionLayout } from "@/components/domains/SeatSelectionLayout";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const { showId } = await params;
  const show = await getShowDetailsAction(showId);
  const seats = await getShowSeatsAction(showId);

  if (!show) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-[#030712]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Show not found</h2>
            <Link href="/" className="text-primary hover:underline mt-2 inline-block">Back to home</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const formattedShow = {
    id: show.id,
    startTime: show.startTime,
    movie: {
      title: show.movie.title,
      posterUrl: show.movie.posterUrl,
    },
    screen: {
      name: show.screen.name,
      theatre: {
        name: show.screen.theatre.name,
        city: show.screen.theatre.city.name,
      },
    },
  };

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-[#030712] py-8">
        <SeatSelectionLayout show={formattedShow} initialSeats={seats} userEmail={session.user.email!} />
      </main>
      <Footer />
    </>
  );
}
