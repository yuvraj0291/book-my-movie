import React from "react";
import { getBookingByIdAction } from "@/app/actions/bookingActions";
import Link from "next/link";
import { ShieldAlert, Printer, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PrintTicketPageProps {
  params: Promise<{ bookingId: string }>;
}

export async function generateMetadata({ params }: PrintTicketPageProps): Promise<Metadata> {
  const { bookingId } = await params;
  return {
    title: `Ticket - ${bookingId} | MovieRocks`,
    description: "Print-friendly MovieRocks E-Ticket",
  };
}

export default async function PrintTicketPage({ params }: PrintTicketPageProps) {
  const { bookingId } = await params;
  const booking = await getBookingByIdAction(bookingId);

  if (!booking || booking.status !== "CONFIRMED") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="text-center space-y-4 max-w-sm">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-black">Invalid or Unpaid Ticket</h2>
          <p className="text-sm text-zinc-500">We couldn't find a confirmed booking matching this reference number.</p>
          <Link
            href="/bookings"
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors inline-block"
          >
            Back to Bookings
          </Link>
        </div>
      </main>
    );
  }

  const seatLabels = booking.showSeats.map((s) => `${s.seat.row}-${s.seat.number}`).join(", ");
  const formattedDate = new Date(booking.show.startTime).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-zinc-100 p-4 sm:p-8 flex flex-col items-center justify-start text-zinc-900 print:bg-white print:p-0">
      
      {/* Back & Print Controls (Hidden during print) */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 print:hidden">
        <Link
          href="/bookings"
          className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-rose-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Bookings
        </Link>
        
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Ticket
        </button>
      </div>

      {/* Ticket Layout */}
      <div className="w-full max-w-md bg-white border border-zinc-250 rounded-3xl shadow-lg overflow-hidden flex flex-col relative print:border-none print:shadow-none print:rounded-none">
        
        {/* Ticket Header Banner */}
        <div className="bg-rose-600 text-white px-6 py-5 text-center space-y-1 relative">
          <span className="text-2xl">🍿</span>
          <h1 className="text-lg font-black tracking-tight uppercase">MovieRocks E-Ticket</h1>
          <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Admit One</p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 bg-zinc-50/50 flex flex-col items-center border-b border-dashed border-zinc-200 relative">
          <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
            <img src={booking.qrCodeDataUrl} alt="Ticket QR Code" className="w-44 h-44" />
          </div>
          <span className="font-mono text-[10px] text-zinc-450 mt-3 uppercase tracking-wider">
            Ref: {booking.id}
          </span>
        </div>

        {/* Ticket Details */}
        <div className="p-6 space-y-6">
          
          {/* Movie Title */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black leading-tight text-zinc-900">{booking.show.movie.title}</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {booking.show.screen.theatre.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs border-t border-zinc-150 pt-5">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Screen</span>
              <span className="font-bold text-zinc-800 text-sm mt-0.5 inline-block">{booking.show.screen.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Seats</span>
              <span className="font-black text-rose-600 text-sm mt-0.5 inline-block">{seatLabels}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Showtime</span>
              <span className="font-bold text-zinc-800 text-sm mt-0.5 inline-block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Status</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded font-bold uppercase text-[9px] mt-1 inline-block">
                PAID
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Paid</span>
              <span className="font-extrabold text-zinc-900 text-sm mt-0.5 inline-block">
                ${booking.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* Security watermark footer */}
        <div className="bg-zinc-50 border-t border-zinc-150 px-6 py-4 text-center text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
          Valid only for the show specified. No refunds.
        </div>

      </div>

      {/* Auto-print Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          `,
        }}
      />

    </main>
  );
}
