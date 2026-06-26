import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getMovieByIdAction } from "@/app/actions/movieActions";
import { getShowsByMovieAndCityAction } from "@/app/actions/showActions";
import Link from "next/link";
import { Star, Clock, Languages, MapPin } from "lucide-react";

export default async function MovieDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ movieId: string }>;
  searchParams: Promise<{ city?: string; date?: string }>;
}) {
  const { movieId } = await params;
  const { city = "Mumbai", date = new Date().toISOString().split("T")[0] } = await searchParams;

  const movie = await getMovieByIdAction(movieId);
  if (!movie) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-[#030712]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Movie not found</h2>
            <Link href="/" className="text-primary hover:underline mt-2 inline-block">Back to home</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const theatresWithShows = await getShowsByMovieAndCityAction(movieId, city, date);

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    return { dateStr, label, dayNum, month };
  });

  return (
    <>
      <Header />

      <main className="flex-1 w-full bg-[#030712]">
        {/* Banner Section */}
        <section className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden border-b border-white/5 bg-[#080d19]">
          <div className="absolute inset-0">
            <img
              src={movie.bannerUrl}
              alt={movie.title}
              className="w-full h-full object-cover object-center opacity-25 blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712]/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 via-[#030712]/40 to-transparent" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-end w-full">
              {/* Floating poster card */}
              <div className="hidden md:block w-48 shrink-0 aspect-[2/3] rounded-xl overflow-hidden glass border border-white/10 shadow-2xl relative translate-y-16">
                <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
              </div>

              {/* Title, rating and metrics */}
              <div className="space-y-3 pb-2 flex-1">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-zinc-300 font-light">
                  <span className="flex items-center gap-1 text-yellow-500 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    {movie.rating.toFixed(1)}/10
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {movie.durationMins} mins
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Languages className="w-4 h-4" />
                    {movie.language}
                  </span>
                  <span>•</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">{movie.genre}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content panel */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-24 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Scheduling content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Horizontal Date picker */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-white/5 pb-4">
              {dateOptions.map((opt) => {
                const isSelected = opt.dateStr === date;
                return (
                  <Link
                    key={opt.dateStr}
                    href={`/movie/${movieId}?city=${city}&date=${opt.dateStr}`}
                    className={`flex flex-col items-center p-3 min-w-16 rounded-xl border transition-all text-center ${
                      isSelected
                        ? "bg-primary border-primary text-white scale-102 shadow-lg shadow-primary/10"
                        : "bg-white/3 hover:bg-white/5 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-semibold tracking-wider opacity-80">{opt.label}</span>
                    <span className="text-lg font-bold mt-1 leading-none">{opt.dayNum}</span>
                    <span className="text-[10px] mt-1 opacity-70">{opt.month}</span>
                  </Link>
                );
              })}
            </div>

            {/* List shows grouped by theatre */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Showtimes in {city}</span>
              </h2>

              {theatresWithShows.length === 0 ? (
                <div className="text-center py-16 bg-white/3 rounded-xl border border-white/5">
                  <p className="text-zinc-400 text-sm font-light">No shows scheduled for {new Date(date).toLocaleDateString("en-US", { dateStyle: "long" })}.</p>
                  <p className="text-zinc-600 text-xs mt-1">Try picking another date or selecting a different city.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {theatresWithShows.map((theatre: any) => (
                    <div key={theatre.id} className="p-6 rounded-xl glass border border-white/5 flex flex-col md:flex-row gap-6 items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-base">{theatre.name}</h3>
                        <p className="text-xs text-zinc-500 font-light">{theatre.address}</p>
                      </div>

                      <div className="flex flex-wrap gap-3 max-w-lg">
                        {theatre.shows.map((show: any) => {
                          const timeLabel = new Date(show.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <Link
                              key={show.id}
                              href={`/booking/${show.id}`}
                              className="px-4 py-2 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 font-semibold text-xs rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all text-center"
                            >
                              <div className="font-bold">{timeLabel}</div>
                              <div className="text-[10px] opacity-75 font-light mt-0.5">{show.screenName}</div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Synopsis sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl glass border border-white/5 space-y-4">
              <h3 className="font-bold text-white tracking-tight text-sm uppercase">Synopsis</h3>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                {movie.description}
              </p>
            </div>
            
            <div className="p-6 rounded-xl glass border border-white/5 space-y-3 text-xs font-light text-zinc-500">
              <h3 className="font-bold text-white text-xs tracking-tight uppercase">Booking Details</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Seats are held in a pending state for a maximum of 5 minutes once selected.</li>
                <li>Make sure to double check date, time, and seat choices before checkout.</li>
                <li>All tickets are secure. E-tickets are sent automatically to your verified email address.</li>
              </ul>
            </div>
          </div>

        </section>
      </main>

      <Footer />
    </>
  );
}
