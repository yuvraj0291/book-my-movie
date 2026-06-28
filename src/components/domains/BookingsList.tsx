"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Calendar,
  Clock,
  Search,
  X,
  Printer,
  Mail,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  HelpCircle,
  Download,
} from "lucide-react";
import { cancelBookingAction, resendConfirmationEmailAction } from "@/app/actions/bookingActions";
import Link from "next/link";

interface BookingItem {
  id: string;
  userId: string;
  showId: string;
  totalPrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  qrCodeDataUrl: string;
  show: {
    startTime: Date;
    movie: { title: string; posterUrl: string };
    screen: { name: string; theatre: { name: string; city: string } };
  };
  showSeats: Array<{
    id: string;
    price: number;
    seatId: string;
    seat: { row: string; number: number; type: string };
  }>;
  payment: any;
}

interface BookingsListProps {
  initialBookings: BookingItem[];
}

export function BookingsList({ initialBookings }: BookingsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  // Email and cancellation statuses
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleResendEmail = async (bookingId: string) => {
    setResendStatus("Resending...");
    const res = await resendConfirmationEmailAction(bookingId);
    if (res.success) {
      setResendStatus("Confirmation Email Sent!");
    } else {
      setResendStatus("Failed to resend email.");
    }
    setTimeout(() => setResendStatus(null), 3000);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (
      !confirm(
        "Are you sure you want to cancel this booking? A refund will be initiated to your original payment method."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    const res = await cancelBookingAction(bookingId);
    setIsCancelling(false);

    if (res.error) {
      setCancelError(res.error);
    } else if (res.success) {
      alert("Booking cancelled successfully! A full refund has been initiated.");
      setSelectedBooking(null);
      router.refresh();
      // Optimistic state update
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      );
    }
  };

  // Filter bookings based on active tab and search query
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.show.movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.show.screen.theatre.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const showTime = new Date(booking.show.startTime);
    const now = new Date();

    if (activeTab === "upcoming") {
      return booking.status === "CONFIRMED" && showTime >= now;
    }
    if (activeTab === "past") {
      return booking.status === "CONFIRMED" && showTime < now;
    }
    if (activeTab === "cancelled") {
      return booking.status === "CANCELLED";
    }
    return true;
  });

  return (
    <div className="space-y-8 text-zinc-950 dark:text-white">
      
      {/* Search and Filters bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs select-none">
        
        {/* Tab switchers */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl gap-1 w-full sm:w-auto">
          {(["upcoming", "past", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-rose-600 text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by movie or theatre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none focus:border-rose-500/50"
          />
        </div>
      </div>

      {/* Bookings Grid list */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-850 p-6 flex flex-col items-center justify-center space-y-4 shadow-xs">
          <Ticket className="w-10 h-10 text-rose-600/30" />
          <div className="space-y-1">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No bookings found</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">There are no {activeTab} bookings matching your criteria.</p>
          </div>
          {activeTab === "upcoming" && (
            <Link
              href="/"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all inline-block shadow-md shadow-rose-500/25"
            >
              Browse Movies
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookings.map((booking) => {
            const showTime = new Date(booking.show.startTime);
            const formattedDate = showTime.toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const seatLabels = booking.showSeats.map((s) => `${s.seat.row}-${s.seat.number}`).join(", ");
            const isConfirmed = booking.status === "CONFIRMED";

            return (
              <div
                key={booking.id}
                className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs flex flex-col justify-between space-y-5 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all"
              >
                <div className="flex gap-4 items-start">
                  <img src={booking.show.movie.posterUrl} alt={booking.show.movie.title} className="w-16 aspect-[2/3] object-cover rounded-xl shadow-sm shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight text-zinc-900 dark:text-white truncate">{booking.show.movie.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{booking.show.screen.theatre.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">{booking.show.screen.name}</p>
                    
                    <div className="flex flex-wrap gap-x-3 pt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formattedDate}</span>
                      <span className="text-rose-600">Seats: {seatLabels}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase block">Total Price</span>
                    <span className="text-base font-black text-zinc-950 dark:text-white">${booking.totalPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setCancelError(null);
                        }}
                        className="px-4 py-2 bg-rose-600/10 text-rose-600 dark:text-rose-450 border border-rose-555/20 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        View Ticket
                      </button>
                    )}

                    {!isConfirmed && (
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border border-zinc-200 dark:border-zinc-800">
                        {booking.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TICKET DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative animate-in scale-in duration-200 text-zinc-900 dark:text-white">
            
            {/* Close button */}
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ticket Header */}
            <div className="bg-rose-600 text-white px-6 py-6 text-center space-y-1">
              <span className="text-3xl">🍿</span>
              <h3 className="text-lg font-black tracking-tight uppercase">MovieRocks E-Ticket</h3>
              <p className="text-[9px] uppercase font-bold tracking-wider opacity-85">Admit One</p>
            </div>

            {/* QR Code */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/10 flex flex-col items-center border-b border-dashed border-zinc-200 dark:border-zinc-900">
              <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <img src={selectedBooking.qrCodeDataUrl} alt="Ticket QR Code" className="w-40 h-40" />
              </div>
              <span className="font-mono text-[9px] text-zinc-450 mt-3 uppercase tracking-wider">
                Ref: {selectedBooking.id}
              </span>
            </div>

            {/* Details */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="text-center space-y-1">
                <h4 className="text-lg font-black leading-tight">{selectedBooking.show.movie.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  {selectedBooking.show.screen.theatre.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs border-t border-zinc-100 dark:border-zinc-900 pt-5">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Screen</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5 inline-block">{selectedBooking.show.screen.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Seats</span>
                  <span className="font-black text-rose-600 text-sm mt-0.5 inline-block">
                    {selectedBooking.showSeats.map((s) => `${s.seat.row}-${s.seat.number}`).join(", ")}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Showtime</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5 inline-block">
                    {new Date(selectedBooking.show.startTime).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Status details */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-850 space-y-2 text-xs">
                {selectedBooking.status === "CANCELLED" ? (
                  <div className="flex gap-2 items-center text-red-500 font-bold">
                    <AlertCircle className="w-4.5 h-4.5" />
                    <span>Refund Status: Refunded to original card</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-zinc-400">Paid Amount:</span>
                    <span className="text-emerald-500">${selectedBooking.totalPrice.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {cancelError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-450 flex gap-1.5"><AlertCircle className="w-4.5 h-4.5 shrink-0" /><span>{cancelError}</span></div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-zinc-150 dark:border-zinc-850 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/20">
              <div className="flex gap-2">
                <Link
                  href={`/booking/ticket/${selectedBooking.id}/print`}
                  target="_blank"
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print / Save
                </Link>
                
                <button
                  onClick={() => handleResendEmail(selectedBooking.id)}
                  className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4" /> {resendStatus || "Resend Email"}
                </button>
              </div>

              {selectedBooking.status === "CONFIRMED" && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  disabled={isCancelling}
                  className="w-full py-2.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> {isCancelling ? "Cancelling..." : "Cancel Ticket (Refund)"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
