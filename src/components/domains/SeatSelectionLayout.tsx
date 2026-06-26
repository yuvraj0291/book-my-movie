"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { holdSeatsAndCreateBookingAction, confirmBookingPaymentAction } from "@/app/actions/bookingActions";
import { Film, Calendar, Clock, CreditCard, AlertCircle, CheckCircle, Timer } from "lucide-react";

interface SeatSelectionLayoutProps {
  show: {
    id: string;
    startTime: Date;
    movie: { title: string; posterUrl: string };
    screen: { name: string; theatre: { name: string; city: string } };
  };
  initialSeats: Array<{
    id: string;
    seatId: string;
    bookingId: string | null;
    status: string;
    price: number;
    seat: { row: string; number: number; type: string };
  }>;
  userEmail: string;
}

export function SeatSelectionLayout({ show, initialSeats, userEmail }: SeatSelectionLayoutProps) {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]); // seatIds
  const [isHolding, setIsHolding] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [gateway, setGateway] = useState<"STRIPE" | "RAZORPAY">("STRIPE");
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Group seats by Row
  const groupedSeats: { [key: string]: typeof initialSeats } = {};
  initialSeats.forEach((seat) => {
    const row = seat.seat.row;
    if (!groupedSeats[row]) {
      groupedSeats[row] = [];
    }
    groupedSeats[row].push(seat);
  });

  // Sort seats in each row by seat number
  Object.keys(groupedSeats).forEach((row) => {
    groupedSeats[row].sort((a, b) => a.seat.number - b.seat.number);
  });

  // Timer Effect
  useEffect(() => {
    if (!isCheckoutOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckoutOpen, timeLeft]);

  // Handle Seat Hold Expiry
  useEffect(() => {
    if (timeLeft === 0 && isCheckoutOpen) {
      setIsCheckoutOpen(false);
      setBookingId(null);
      setPaymentIntent(null);
      setSelectedSeats([]);
      alert("Seat hold time expired. Your seats have been released.");
      router.refresh();
    }
  }, [timeLeft, isCheckoutOpen]);

  const handleSeatClick = (seatId: string, status: string) => {
    if (status !== "AVAILABLE") return;
    
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getSelectedSeatLabels = () => {
    const selected = initialSeats.filter((s) => selectedSeats.includes(s.seatId));
    return selected.map((s) => `${s.seat.row}-${s.seat.number}`).join(", ");
  };

  const calculateTotal = () => {
    const selected = initialSeats.filter((s) => selectedSeats.includes(s.seatId));
    return selected.reduce((sum, s) => sum + s.price, 0);
  };

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) return;
    setIsHolding(true);
    setCheckoutError(null);

    try {
      const result = await holdSeatsAndCreateBookingAction(show.id, selectedSeats, gateway);
      if (result.error) {
        setCheckoutError(result.error);
        return;
      }

      if (result.success && result.bookingId && result.paymentIntent) {
        setBookingId(result.bookingId);
        setPaymentIntent(result.paymentIntent);
        setTimeLeft(300);
        setIsCheckoutOpen(true);
      }
    } catch (e) {
      setCheckoutError("Failed to lock seats. Please try again.");
    } finally {
      setIsHolding(false);
    }
  };

  const handlePaymentConfirm = async () => {
    if (!bookingId || !paymentIntent) return;
    setIsProcessingPayment(true);
    setCheckoutError(null);

    // Simulate payment processing since Stripe/Razorpay keys might be mocked or blank in sandbox
    setTimeout(async () => {
      try {
        const payload = gateway === "STRIPE" 
          ? { stripePaymentIntentId: paymentIntent.id || `pi_mock_${Math.random().toString(36).substring(7)}` }
          : { razorpayOrderId: paymentIntent.id, razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(7)}` };

        const confirmResult = await confirmBookingPaymentAction(bookingId, gateway, payload);
        if (confirmResult.error) {
          setCheckoutError(confirmResult.error);
        } else if (confirmResult.success) {
          router.push(`/bookings?success=true&bookingId=${bookingId}`);
        }
      } catch (e) {
        setCheckoutError("Payment confirmation failed. Contact support if balance was debited.");
      } finally {
        setIsProcessingPayment(false);
      }
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Seat Layout Section */}
      <div className="lg:col-span-2 space-y-8 bg-zinc-950 p-6 sm:p-8 rounded-2xl border border-white/5 relative">
        {/* Screen Indicator */}
        <div className="w-full flex flex-col items-center select-none pt-4">
          <div className="w-4/5 h-2 bg-gradient-to-r from-rose-500/10 via-rose-500/80 to-rose-500/10 rounded-full shadow-[0_0_20px_0_rgba(225,29,72,0.3)]" />
          <span className="text-[10px] text-rose-400 font-medium tracking-[0.3em] uppercase mt-2">Screen this way</span>
        </div>

        {/* Seat Map */}
        <div className="overflow-x-auto no-scrollbar py-6 flex justify-center">
          <div className="flex flex-col gap-3 min-w-[450px]">
            {Object.keys(groupedSeats).sort().map((rowName) => (
              <div key={rowName} className="flex items-center gap-4">
                <span className="w-6 text-zinc-500 font-bold text-sm text-center select-none">{rowName}</span>
                <div className="flex gap-2">
                  {groupedSeats[rowName].map((seat) => {
                    const isSelected = selectedSeats.includes(seat.seatId);
                    const isBooked = seat.status === "BOOKED";
                    const isLocked = seat.status === "LOCKED";
                    
                    let bgClass = "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-white/5 cursor-pointer";
                    if (isBooked) bgClass = "bg-zinc-900/50 text-zinc-700 border border-transparent cursor-not-allowed";
                    if (isLocked) bgClass = "bg-zinc-800/40 text-zinc-600 border border-transparent cursor-not-allowed";
                    if (isSelected) bgClass = "bg-primary text-white border-primary shadow-[0_0_10px_0_rgba(225,29,72,0.4)] cursor-pointer";

                    return (
                      <button
                        key={seat.id}
                        disabled={isBooked || isLocked}
                        onClick={() => handleSeatClick(seat.seatId, seat.status)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${bgClass}`}
                        title={`Seat ${rowName}-${seat.seat.number} ($${seat.price})`}
                      >
                        {seat.seat.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs text-zinc-400 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-zinc-800 border border-white/5" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-primary border-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-zinc-850/50" />
            <span>Locked/Held</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-zinc-900/30" />
            <span>Booked</span>
          </div>
        </div>
      </div>

      {/* Summary / Reservation Card */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl glass border border-white/5 space-y-6 relative overflow-hidden">
          
          <div className="flex items-start gap-4">
            <img src={show.movie.posterUrl} alt={show.movie.title} className="w-20 aspect-[2/3] object-cover rounded-lg" />
            <div className="space-y-1">
              <h3 className="font-bold text-white leading-tight">{show.movie.title}</h3>
              <p className="text-xs text-zinc-500">{show.screen.theatre.name}</p>
              <p className="text-xs text-zinc-500 font-light">{show.screen.name}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-zinc-300 border-t border-white/5 pt-4">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-light">Showtime:</span>
              <span className="font-medium">{new Date(show.startTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-light">Selected Seats:</span>
              <span className="font-bold text-primary truncate max-w-[150px]">{getSelectedSeatLabels() || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-light">Payment Gateway:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setGateway("STRIPE")}
                  className={`px-2.5 py-1 rounded text-xs border ${gateway === "STRIPE" ? "border-primary text-primary bg-primary/5" : "border-white/5 text-zinc-400"}`}
                >
                  Stripe
                </button>
                <button
                  onClick={() => setGateway("RAZORPAY")}
                  className={`px-2.5 py-1 rounded text-xs border ${gateway === "RAZORPAY" ? "border-primary text-primary bg-primary/5" : "border-white/5 text-zinc-400"}`}
                >
                  Razorpay
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex justify-between items-end">
            <div>
              <span className="text-xs text-zinc-500 block">Subtotal:</span>
              <span className="text-xl font-bold text-white">${calculateTotal().toFixed(2)}</span>
            </div>
            
            <button
              onClick={handleHoldSeats}
              disabled={selectedSeats.length === 0 || isHolding}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isHolding ? "Locking Seats..." : "Proceed to Payment"}
            </button>
          </div>
          
          {checkoutError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex gap-1.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{checkoutError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl relative space-y-6"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-bold text-white text-lg">Secure Ticket Checkout</h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Booking Summary */}
              <div className="bg-white/3 rounded-xl p-4 space-y-2 border border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Booking Reference:</span>
                  <span className="font-mono text-zinc-300">{bookingId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Seats:</span>
                  <span className="font-semibold text-white">{getSelectedSeatLabels()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Gross Total:</span>
                  <span className="font-bold text-primary">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <CreditCard className="w-4 h-4 text-zinc-500" />
                  <span>Paying via {gateway === "STRIPE" ? "Stripe Credit Card Elements" : "Razorpay Net Banking / UPI"}</span>
                </div>
                
                {/* Mock Card Input Form for Visual Integration */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value="John Doe"
                    disabled
                    className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-zinc-400 focus:outline-none cursor-not-allowed"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Card Number"
                      value="•••• •••• •••• 4242"
                      disabled
                      className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-zinc-400 focus:outline-none cursor-not-allowed"
                    />
                    <div className="absolute right-3.5 top-3 text-[10px] uppercase font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded">
                      Mock Visa
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setBookingId(null);
                    setPaymentIntent(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-white/5 text-zinc-400 hover:text-white text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel Hold
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isProcessingPayment ? "Validating..." : `Pay $${calculateTotal().toFixed(2)}`}
                </button>
              </div>

              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {checkoutError}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
