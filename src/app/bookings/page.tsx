import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getUserBookingsAction, getBookingByIdAction } from "@/app/actions/bookingActions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Ticket, Calendar, CheckCircle2, ChevronRight } from "lucide-react";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; bookingId?: string }>;
}) {
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

      <main className="flex-1 w-full bg-[#030712] py-12">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          
          {successBooking && (
            <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Booking Confirmed!</h1>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Your payment of <span className="text-emerald-400 font-bold">${successBooking.totalPrice.toFixed(2)}</span> has been verified. Tickets have been sent to your email address: <span className="text-white font-medium">{session.user.email}</span>.
                </p>
              </div>

              <div className="max-w-md mx-auto rounded-xl glass border border-white/10 text-left p-6 space-y-4">
                <div className="flex gap-4 items-start pb-4 border-b border-white/5">
                  <img src={successBooking.show.movie.posterUrl} alt={successBooking.show.movie.title} className="w-16 aspect-[2/3] object-cover rounded-lg" />
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight">{successBooking.show.movie.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{successBooking.show.screen.theatre.name}</p>
                    <p className="text-[10px] text-zinc-500 font-light">{successBooking.show.screen.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-light text-zinc-400 pb-4 border-b border-white/5">
                  <div>
                    <span className="block text-[10px] text-zinc-600 uppercase font-semibold">Date & Time</span>
                    <span className="text-zinc-200 mt-0.5 inline-block font-medium">
                      {new Date(successBooking.show.startTime).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-600 uppercase font-semibold">Seats</span>
                    <span className="text-primary mt-0.5 inline-block font-bold">
                      {successBooking.showSeats.map(s => `${s.seat.row}-${s.seat.number}`).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-600 uppercase font-semibold block">Ticket Reference</span>
                    <span className="font-mono text-zinc-400">{successBooking.id}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                    PAID
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />
              <span>Your Booking History</span>
            </h2>

            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-white/3 rounded-2xl border border-white/5 space-y-4">
                <p className="text-zinc-400 text-sm">You haven't booked any movie tickets yet.</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-lg shadow-lg shadow-primary/10 transition-all"
                >
                  <span>Browse Recommended Movies</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isActiveSuccess = successBooking?.id === booking.id;
                  if (isActiveSuccess) return null;

                  const formattedDate = new Date(booking.show.startTime).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                  const seatLabels = booking.showSeats.map(s => `${s.seat.row}-${s.seat.number}`).join(", ");
                  const isConfirmed = booking.status === "CONFIRMED";

                  return (
                    <div
                      key={booking.id}
                      className="p-5 rounded-xl glass border border-white/5 flex flex-col md:flex-row gap-6 items-start justify-between hover:border-white/10 transition-all"
                    >
                      <div className="flex gap-4 items-start">
                        <img src={booking.show.movie.posterUrl} alt={booking.show.movie.title} className="w-16 aspect-[2/3] object-cover rounded-lg" />
                        <div className="space-y-1">
                          <h3 className="font-bold text-white text-base leading-tight">{booking.show.movie.title}</h3>
                          <p className="text-xs text-zinc-400">{booking.show.screen.theatre.name} ({booking.show.screen.name})</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 pt-1 font-light">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formattedDate}</span>
                            <span className="text-primary font-bold">Seats: {seatLabels}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-end justify-between md:justify-start w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-3 md:mt-0 gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-600 uppercase font-semibold block">Total Price</span>
                          <span className="text-base font-bold text-white">${booking.totalPrice.toFixed(2)}</span>
                        </div>
                        
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${
                          isConfirmed 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : booking.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
