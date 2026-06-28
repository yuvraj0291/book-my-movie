import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getUserBookingsAction, getBookingByIdAction } from "@/app/actions/bookingActions";
import { BookingsList } from "@/components/domains/BookingsList";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Ticket, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface BookingsPageProps {
  searchParams: Promise<{ success?: string; bookingId?: string }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const { success, bookingId } = await searchParams;

  const bookings = await getUserBookingsAction();

  const successBooking = success === "true" && bookingId 
    ? await getBookingByIdAction(bookingId) 
    : null;

  return (
    <>
      <Header />

      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] py-12 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          
          {/* Success Banner if redirected from successful booking */}
          {successBooking && (
            <div className="p-8 rounded-3xl bg-emerald-555/5 border border-emerald-500/20 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Booking Confirmed!</h1>
                <p className="text-zinc-550 dark:text-zinc-400 text-sm max-w-md mx-auto">
                  Your payment of <span className="text-emerald-600 dark:text-emerald-400 font-bold">${successBooking.totalPrice.toFixed(2)}</span> has been verified. Tickets have been sent to your email: <span className="text-rose-600 font-medium">{session.user.email}</span>.
                </p>
              </div>

              <div className="max-w-md mx-auto rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-left p-6 space-y-4 shadow-xs">
                <div className="flex gap-4 items-start pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <img src={successBooking.show.movie.posterUrl} alt={successBooking.show.movie.title} className="w-14 aspect-[2/3] object-cover rounded-lg shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm leading-tight">{successBooking.show.movie.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{successBooking.show.screen.theatre.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mt-0.5">{successBooking.show.screen.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 pb-4 border-b border-zinc-150 dark:border-zinc-850">
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Date & Time</span>
                    <span className="text-zinc-800 dark:text-zinc-200 mt-0.5 inline-block font-medium">
                      {new Date(successBooking.show.startTime).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Seats</span>
                    <span className="text-rose-600 dark:text-rose-450 mt-0.5 inline-block font-bold">
                      {successBooking.showSeats.map((s) => `${s.seat.row}-${s.seat.number}`).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase block">Ticket Reference</span>
                    <span className="font-mono text-zinc-500">{successBooking.id}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded font-extrabold text-[9px] uppercase tracking-wider">
                    PAID
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-6 h-6 text-rose-600" />
              <span>Your Booking History</span>
            </h2>

            <BookingsList initialBookings={bookings as any[]} />
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
