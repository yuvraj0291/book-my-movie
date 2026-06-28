"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { holdSeatsAndCreateBookingAction, confirmBookingPaymentAction, resendConfirmationEmailAction } from "@/app/actions/bookingActions";
import { getShowSeatsAction } from "@/app/actions/showActions";
import {
  Film,
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Timer,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ChevronRight,
  ShoppingBag,
  Printer,
  Mail,
  User,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { SeatType } from "@/types";

interface SeatSelectionLayoutProps {
  show: {
    id: string;
    startTime: Date;
    movie: { title: string; posterUrl: string };
    screen: { name: string; theatre: { name: string; city: string } };
  };
  initialSeats: any[];
  userEmail: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export function SeatSelectionLayout({ show, initialSeats, userEmail }: SeatSelectionLayoutProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step state: "seats" | "fb" | "payment" | "success"
  const [step, setStep] = useState<"seats" | "fb" | "payment" | "success">("seats");

  // Seats State
  const [seats, setSeats] = useState(initialSeats);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]); // seatIds
  const [recommendationCount, setRecommendationCount] = useState(2);

  // Zoom / Pan State for Seat Map
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // F&B Cart State
  const [fbCart, setFbCart] = useState<CartItem[]>([]);

  // Checkout State
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [gateway, setGateway] = useState<"STRIPE" | "RAZORPAY">("STRIPE");
  const [timeLeft, setTimeLeft] = useState(480); // 8 minutes in seconds
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // 1. Polling Effect for Real-Time Seat Statuses (every 5 seconds)
  useEffect(() => {
    if (step === "success") return;

    const interval = setInterval(async () => {
      const updatedSeats = await getShowSeatsAction(show.id);
      if (updatedSeats && updatedSeats.length > 0) {
        setSeats(updatedSeats);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [show.id, step]);

  // 2. Timer Effect synchronized with server expiresAt
  useEffect(() => {
    if (step !== "fb" && step !== "payment") return;
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        handleHoldExpiry();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [step, expiresAt]);

  const handleHoldExpiry = () => {
    setStep("seats");
    setBookingId(null);
    setPaymentIntent(null);
    setSelectedSeats([]);
    setFbCart([]);
    alert("Your 8-minute seat hold has expired. The seats have been released.");
    router.refresh();
  };

  // Group seats by Row
  const groupedSeats: { [key: string]: any[] } = {};
  seats.forEach((seat) => {
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

  // Zoom / Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drag
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(2.0, Math.max(0.5, prev + factor)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Seat Click Handler
  const handleSeatClick = (seatId: string, status: string) => {
    if (status !== "AVAILABLE") return;
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  // F&B Catalog
  const fbCatalog: CartItem[] = [
    { id: "fb1", name: "Regular Popcorn Combo", price: 8.0, quantity: 0, image: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=200" },
    { id: "fb2", name: "Caramel Popcorn Large", price: 10.0, quantity: 0, image: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?q=80&w=200" },
    { id: "fb3", name: "Soda Pop Regular", price: 4.5, quantity: 0, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=200" },
    { id: "fb4", name: "Nachos with Cheese", price: 6.5, quantity: 0, image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?q=80&w=200" },
    { id: "fb5", name: "Double Combo (2 Popcorn + 2 Sodas)", price: 18.0, quantity: 0, image: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=200" },
  ];

  const handleAddFb = (item: CartItem) => {
    setFbCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleRemoveFb = (itemId: string) => {
    setFbCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Yield-Aware Contiguous Best Seat Recommendation Algorithm
  const handleRecommendSeats = () => {
    const N = recommendationCount;
    const sortedRows = Object.keys(groupedSeats).sort();
    const midRowIdx = Math.floor(sortedRows.length / 2);

    let bestSelection: string[] = [];
    let bestScore = -Infinity;

    sortedRows.forEach((rowName, rIdx) => {
      const rowSeats = groupedSeats[rowName];
      const middleCol = Math.floor(rowSeats.length / 2);

      // Slide a window of size N over the row
      for (let i = 0; i <= rowSeats.length - N; i++) {
        const window = rowSeats.slice(i, i + N);

        // Check if all seats in the window are available
        const allAvailable = window.every((s) => s.status === "AVAILABLE");
        if (!allAvailable) continue;

        // Check if contiguous (i.e. no gaps/walkways between their column numbers)
        // Since seats are sorted, check if column numbers are consecutive
        let isContiguous = true;
        for (let j = 0; j < N - 1; j++) {
          if (window[j + 1].seat.number !== window[j].seat.number + 1) {
            isContiguous = false;
            break;
          }
        }
        if (!isContiguous) continue;

        // Scoring algorithm
        // 1. Proximity to center row
        const rowDistance = Math.abs(rIdx - midRowIdx);
        const rowScore = (10 - rowDistance) * 3;

        // 2. Proximity to center column
        const avgCol = window.reduce((sum, s) => sum + s.seat.number, 0) / N;
        const colDistance = Math.abs(avgCol - middleCol);
        const colScore = (10 - colDistance) * 2;

        // 3. Category weighting
        const categoryWeights: Record<string, number> = {
          NORMAL: 10,
          PREMIUM: 15,
          VIP: 25,
          RECLINER: 30,
          COUPLE: 35,
          WHEELCHAIR: 5,
        };
        const avgCategoryScore = window.reduce((sum, s) => sum + (categoryWeights[s.seat.type] || 10), 0) / N;

        // 4. Yield Management: Avoid leaving isolated single seat gaps
        let gapPenalty = 0;
        const startIdx = i;
        const endIdx = i + N - 1;

        // Check seat before the window
        if (startIdx > 0) {
          const seatBefore = rowSeats[startIdx - 1];
          const seatTwoBefore = startIdx > 1 ? rowSeats[startIdx - 2] : null;
          // If seat before is available, but the one before that is booked/empty, it's a 1-seat gap!
          if (
            seatBefore.status === "AVAILABLE" &&
            (!seatTwoBefore || seatTwoBefore.status !== "AVAILABLE")
          ) {
            gapPenalty -= 15;
          }
        }

        // Check seat after the window
        if (endIdx < rowSeats.length - 1) {
          const seatAfter = rowSeats[endIdx + 1];
          const seatTwoAfter = endIdx < rowSeats.length - 2 ? rowSeats[endIdx + 2] : null;
          if (
            seatAfter.status === "AVAILABLE" &&
            (!seatTwoAfter || seatTwoAfter.status !== "AVAILABLE")
          ) {
            gapPenalty -= 15;
          }
        }

        const totalScore = rowScore + colScore + avgCategoryScore + gapPenalty;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestSelection = window.map((s) => s.seatId);
        }
      }
    });

    if (bestSelection.length > 0) {
      setSelectedSeats(bestSelection);
    } else {
      // Fallback: Pick top N available seats globally by score
      const scoredSeats: Array<{ id: string; score: number }> = [];
      sortedRows.forEach((rowName, rIdx) => {
        groupedSeats[rowName].forEach((s) => {
          if (s.status !== "AVAILABLE") return;
          const rowDistance = Math.abs(rIdx - midRowIdx);
          const colDistance = Math.abs(s.seat.number - Math.floor(groupedSeats[rowName].length / 2));
          const score = (10 - rowDistance) * 3 + (10 - colDistance) * 2;
          scoredSeats.push({ id: s.seatId, score });
        });
      });

      scoredSeats.sort((a, b) => b.score - a.score);
      setSelectedSeats(scoredSeats.slice(0, N).map((s) => s.id));
    }
  };

  // Pricing calculations
  const calculateTicketSubtotal = () => {
    const selected = seats.filter((s) => selectedSeats.includes(s.seatId));
    return selected.reduce((sum, s) => sum + s.price, 0);
  };

  const calculateFbTotal = () => {
    return fbCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const convenienceFeeRate = 1.5; // per ticket
  const taxRate = 0.18; // 18% GST

  const ticketSubtotal = calculateTicketSubtotal();
  const fbTotal = calculateFbTotal();
  const convenienceFee = selectedSeats.length * convenienceFeeRate;
  const taxes = ticketSubtotal * taxRate;
  const grandTotal = ticketSubtotal + fbTotal + convenienceFee + taxes;

  const handleHoldSeats = async () => {
    if (selectedSeats.length === 0) return;
    setIsHolding(true);
    setCheckoutError(null);

    const res = await holdSeatsAndCreateBookingAction(show.id, selectedSeats, gateway);
    setIsHolding(false);

    if (res.error) {
      setCheckoutError(res.error);
    } else if (res.success && res.bookingId && res.expiresAt) {
      setBookingId(res.bookingId);
      setExpiresAt(res.expiresAt);
      setTimeLeft(Math.max(0, Math.round((res.expiresAt - Date.now()) / 1000)));
      setStep("fb");
    }
  };

  const handlePaymentConfirm = async () => {
    if (!bookingId) return;
    setIsProcessingPayment(true);
    setCheckoutError(null);

    // Simulate Payment Gateway Validation
    setTimeout(async () => {
      const payload =
        gateway === "STRIPE"
          ? { stripePaymentIntentId: `pi_mock_${Math.random().toString(36).substring(7)}` }
          : { razorpayOrderId: `order_mock_${Math.random().toString(36).substring(7)}`, razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(7)}` };

      const res = await confirmBookingPaymentAction(bookingId, gateway, payload);
      setIsProcessingPayment(false);

      if (res.error) {
        setCheckoutError(res.error);
      } else if (res.success) {
        setStep("success");
      }
    }, 1500);
  };

  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const handleResendEmail = async () => {
    if (!bookingId) return;
    setResendStatus("Resending...");
    const res = await resendConfirmationEmailAction(bookingId);
    if (res.success) {
      setResendStatus("Email Sent!");
    } else {
      setResendStatus("Failed to resend.");
    }
    setTimeout(() => setResendStatus(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Step Indicator Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-5 mb-8">
        <div className="flex items-center gap-2.5">
          <Film className="w-6 h-6 text-rose-600" />
          <div>
            <h1 className="text-xl font-black tracking-tight">{show.movie.title}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {show.screen.theatre.name} • {show.screen.name}
            </p>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <span className={step === "seats" ? "text-rose-600" : ""}>1. Seats</span>
          <ChevronRight className="w-4.5 h-4.5" />
          <span className={step === "fb" ? "text-rose-600" : ""}>2. Snacks</span>
          <ChevronRight className="w-4.5 h-4.5" />
          <span className={step === "payment" ? "text-rose-600" : ""}>3. Payment</span>
          <ChevronRight className="w-4.5 h-4.5 text-zinc-650" />
          <span className={step === "success" ? "text-rose-600" : ""}>4. Confirmation</span>
        </div>

        {/* Sync Timer */}
        {(step === "fb" || step === "payment") && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-600/10 text-rose-600 border border-rose-555/20 rounded-full text-xs font-bold">
            <Timer className="w-4 h-4 animate-spin" />
            <span>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ========================================================================= */}
        {/* STEP 1: SEAT SELECTION */}
        {/* ========================================================================= */}
        {step === "seats" && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Map Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleZoom(0.1)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => handleZoom(-0.1)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Reset View"
                >
                  <Maximize2 className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Best Seat Recommendation controls */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-zinc-500">Auto-Recommend:</span>
                <select
                  value={recommendationCount}
                  onChange={(e) => setRecommendationCount(parseInt(e.target.value))}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 font-bold text-zinc-700 dark:text-zinc-350 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} Seats</option>
                  ))}
                </select>
                <button
                  onClick={handleRecommendSeats}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommend</span>
                </button>
              </div>
            </div>

            {/* Interactive zoomable/pannable canvas */}
            <div
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-[55vh] rounded-3xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
            >
              {/* Screen Indicator */}
              <div className="absolute top-6 left-0 right-0 z-10 flex flex-col items-center pointer-events-none">
                <div className="w-2/3 h-1.5 bg-gradient-to-r from-rose-500/10 via-rose-500/85 to-rose-500/10 rounded-full shadow-[0_0_15px_0_rgba(225,29,72,0.4)]" />
                <span className="text-[9px] text-rose-500/60 dark:text-rose-450 font-black tracking-[0.4em] uppercase mt-1.5">SCREEN</span>
              </div>

              {/* Seating Grid Canvas */}
              <div
                className="absolute origin-center p-12 transition-transform duration-75"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  top: "15%",
                  left: "10%",
                }}
              >
                <div className="flex flex-col gap-3 min-w-max">
                  {Object.keys(groupedSeats).sort().map((rowName) => (
                    <div key={rowName} className="flex items-center gap-4">
                      <span className="w-6 text-zinc-400 dark:text-zinc-500 font-bold text-xs text-center">{rowName}</span>
                      
                      <div className="flex gap-2">
                        {groupedSeats[rowName].map((seat) => {
                          const isSelected = selectedSeats.includes(seat.seatId);
                          const isBooked = seat.status === "BOOKED";
                          const isLocked = seat.status === "LOCKED";
                          const type = seat.seat.type as SeatType;

                          let bgClass = "bg-zinc-200 dark:bg-zinc-800/80 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700";
                          if (isBooked) bgClass = "bg-zinc-300/40 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-700 border border-transparent cursor-not-allowed";
                          if (isLocked) bgClass = "bg-zinc-300/40 dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-700 border border-transparent cursor-not-allowed";
                          
                          if (isSelected) {
                            bgClass = "bg-rose-650 text-white border border-rose-650 shadow-[0_0_12px_0_rgba(225,29,72,0.4)]";
                          } else if (!isBooked && !isLocked) {
                            // Category coloring
                            if (type === "PREMIUM") bgClass = "bg-indigo-650/15 border border-indigo-500/35 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white";
                            if (type === "VIP") bgClass = "bg-amber-650/15 border border-amber-500/35 text-amber-650 dark:text-amber-400 hover:bg-amber-600 hover:text-white";
                            if (type === "RECLINER") bgClass = "bg-emerald-650/15 border border-emerald-500/35 text-emerald-650 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white";
                            if (type === "COUPLE") bgClass = "bg-pink-650/15 border border-pink-500/35 text-pink-650 dark:text-pink-400 hover:bg-pink-600 hover:text-white w-17.5"; // Double-wide
                            if (type === "WHEELCHAIR") bgClass = "bg-sky-650/15 border border-sky-500/35 text-sky-650 dark:text-sky-400 hover:bg-sky-600 hover:text-white";
                          }

                          return (
                            <button
                              key={seat.id}
                              disabled={isBooked || isLocked}
                              onClick={() => handleSeatClick(seat.seatId, seat.status)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-extrabold transition-all select-none shrink-0 cursor-pointer ${bgClass}`}
                              title={`Seat ${rowName}-${seat.seat.number} (${type} - $${seat.price})`}
                            >
                              {type === "COUPLE" ? (
                                <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" />{seat.seat.number}</span>
                              ) : (
                                seat.seat.number
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Legends */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex flex-wrap justify-center gap-5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider select-none shadow-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700" /><span>Available</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-600" /><span>Selected</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-900/30 border border-transparent" /><span>Booked</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-500/30" /><span>Premium</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" /><span>VIP</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" /><span>Recliner</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-500/20 border border-pink-500/30" /><span>Couple</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-500/20 border border-sky-500/30" /><span>Wheelchair</span></div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: FOOD & BEVERAGE */}
        {/* ========================================================================= */}
        {step === "fb" && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-rose-600" />
                  <span>Add Movie Snacks & Drinks</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pre-book food and beverages to save up to 20% off counter prices!</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fbCatalog.map((item) => {
                  const cartItem = fbCart.find((i) => i.id === item.id);
                  const qty = cartItem?.quantity || 0;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10 flex gap-4 items-center"
                    >
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight truncate">{item.name}</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-450 font-bold">${item.price.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => handleRemoveFb(item.id)}
                              className="p-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{qty}</span>
                          </>
                        ) : null}
                        <button
                          onClick={() => handleAddFb(item)}
                          className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <button
                  onClick={() => setStep("seats")}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Back to Seats
                </button>
                <button
                  onClick={() => setStep("payment")}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SECURE PAYMENT */}
        {/* ========================================================================= */}
        {step === "payment" && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-rose-600" />
                  <span>Secure Payment Checkout</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Complete payment to finalize your booking.</p>
              </div>

              {/* Gateway Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGateway("STRIPE")}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    gateway === "STRIPE"
                      ? "bg-rose-600/10 border-rose-500/35 text-rose-600 dark:text-rose-450"
                      : "bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-850 text-zinc-500"
                  }`}
                >
                  <span className="font-extrabold text-sm uppercase tracking-wider">Stripe Elements</span>
                  <span className="text-[10px] text-zinc-400">Credit / Debit Cards</span>
                </button>
                <button
                  onClick={() => setGateway("RAZORPAY")}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    gateway === "RAZORPAY"
                      ? "bg-rose-600/10 border-rose-500/35 text-rose-600 dark:text-rose-450"
                      : "bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-850 text-zinc-500"
                  }`}
                >
                  <span className="font-extrabold text-sm uppercase tracking-wider">Razorpay</span>
                  <span className="text-[10px] text-zinc-400">UPI / Net Banking / Wallets</span>
                </button>
              </div>

              {/* Mock Card Form */}
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-900/5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Card Credentials (Sandbox Mode)</h4>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      disabled
                      className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 text-xs px-4 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-850 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• 4242"
                      disabled
                      className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 text-xs px-4 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-850 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-450 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{checkoutError}</div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <button
                  onClick={() => setStep("fb")}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Back to Snacks
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingPayment ? "Processing..." : `Pay $${grandTotal.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUCCESS CONFIRMATION */}
        {/* ========================================================================= */}
        {step === "success" && (
          <div className="lg:col-span-3 max-w-xl mx-auto space-y-6 w-full">
            <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-md text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Booking Confirmed!</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
                  Your tickets have been secured successfully! Confirmation email was sent to <span className="text-rose-600 font-bold">{userEmail}</span>.
                </p>
              </div>

              {/* Show Ticket Link Details */}
              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl text-left space-y-4">
                <div className="flex gap-4 items-center">
                  <img src={show.movie.posterUrl} alt={show.movie.title} className="w-12 h-18 object-cover rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-zinc-900 dark:text-white truncate text-sm">{show.movie.title}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{show.screen.theatre.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mt-0.5">{show.screen.name}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-zinc-150 dark:border-zinc-850 pt-4">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Booking ID</span>
                    <p className="font-mono font-medium text-zinc-650 dark:text-zinc-350">{bookingId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Amount Paid</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-450">${grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={`/booking/ticket/${bookingId}/print`}
                  target="_blank"
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </Link>
                <button
                  onClick={handleResendEmail}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-500/20"
                >
                  <Mail className="w-4 h-4" /> {resendStatus || "Resend Email"}
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850">
                <Link
                  href="/bookings"
                  className="text-xs font-bold text-rose-600 dark:text-rose-450 hover:underline inline-block"
                >
                  View All Booking History →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR: BOOKING SUMMARY (Sticky) */}
        {/* ========================================================================= */}
        {step !== "success" && (
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-5">
              <h3 className="font-black text-sm uppercase tracking-wider border-b border-zinc-150 dark:border-zinc-850 pb-2.5">
                Booking Summary
              </h3>

              {/* Movie info */}
              <div className="flex gap-4 items-start">
                <img src={show.movie.posterUrl} alt={show.movie.title} className="w-14 aspect-[2/3] object-cover rounded-lg shadow-sm shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-900 dark:text-white leading-tight text-sm">{show.movie.title}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{show.screen.theatre.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">{show.screen.name}</p>
                </div>
              </div>

              {/* Tickets and seats selection */}
              <div className="space-y-3 text-xs text-zinc-650 dark:text-zinc-350 font-semibold border-t border-zinc-150 dark:border-zinc-850 pt-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase">Showtime:</span>
                  <span>
                    {new Date(show.startTime).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400 font-bold uppercase">Seats:</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-450 truncate max-w-[150px]">
                    {selectedSeats.length > 0
                      ? seats
                          .filter((s) => selectedSeats.includes(s.seatId))
                          .map((s) => `${s.seat.row}-${s.seat.number}`)
                          .join(", ")
                      : "None"}
                  </span>
                </div>
              </div>

              {/* Pricing details */}
              <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-semibold border-t border-zinc-150 dark:border-zinc-850 pt-4">
                <div className="flex justify-between">
                  <span>Ticket Subtotal:</span>
                  <span className="text-zinc-900 dark:text-white">${ticketSubtotal.toFixed(2)}</span>
                </div>
                {fbTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Snacks & Drinks:</span>
                    <span className="text-zinc-900 dark:text-white">${fbTotal.toFixed(2)}</span>
                  </div>
                )}
                {selectedSeats.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Convenience Fee:</span>
                      <span className="text-zinc-900 dark:text-white">${convenienceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (18% GST):</span>
                      <span className="text-zinc-900 dark:text-white">${taxes.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t border-zinc-150 dark:border-zinc-850 pt-4 flex justify-between items-end">
                <div>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase block">Total Amount</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">${grandTotal.toFixed(2)}</span>
                </div>

                {step === "seats" ? (
                  <button
                    onClick={handleHoldSeats}
                    disabled={selectedSeats.length === 0 || isPending}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-500/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Lock & Continue
                  </button>
                ) : null}
              </div>

              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-450 flex gap-1.5 items-start">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
