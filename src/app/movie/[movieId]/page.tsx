import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getMovieByIdAction, getMovieRecommendationsAction, checkIsFavoriteAction } from "@/app/actions/movieActions";
import { getShowsByMovieAndCityAction } from "@/app/actions/showActions";
import { MovieDetailsClient } from "@/components/domains/MovieDetailsClient";
import Link from "next/link";
import { Star, Clock, Languages, MapPin, Film, Calendar, Users, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface MoviePageProps {
  params: Promise<{ movieId: string }>;
  searchParams: Promise<{ city?: string; date?: string }>;
}

// Dynamic SEO Metadata
export async function generateMetadata({ params }: { params: Promise<{ movieId: string }> }): Promise<Metadata> {
  const { movieId } = await params;
  const movie = await getMovieByIdAction(movieId);
  if (!movie) return {};
  
  return {
    title: `${movie.title} - Book Tickets Online | MovieRocks`,
    description: movie.description,
    openGraph: {
      title: `${movie.title} | MovieRocks`,
      description: movie.description,
      images: [
        {
          url: movie.bannerUrl,
          width: 1200,
          height: 630,
          alt: movie.title,
        },
      ],
    },
  };
}

export default async function MovieDetailsPage({ params, searchParams }: MoviePageProps) {
  const session = await auth();
  const { movieId } = await params;
  const { city = "Mumbai", date = new Date().toISOString().split("T")[0] } = await searchParams;

  const [movie, recommendations, isFavorite] = await Promise.all([
    getMovieByIdAction(movieId),
    getMovieRecommendationsAction(movieId),
    checkIsFavoriteAction(movieId),
  ]);

  if (!movie) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-24 bg-zinc-50 dark:bg-[#030712]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Movie Not Found</h2>
            <Link
              href={`/?city=${city}`}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors inline-block"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const theatresWithShows = await getShowsByMovieAndCityAction(movieId, city, date);

  // Generate 7-day date picker options
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    return { dateStr, label, dayNum, month };
  });

  const cast = movie.actors || [];
  const crew = movie.directors || [];

  return (
    <>
      <Header />

      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] transition-colors duration-200">
        
        {/* Banner Section */}
        <section className="relative w-full h-[45vh] md:h-[55vh] overflow-hidden border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-200 dark:bg-[#080d19]">
          <div className="absolute inset-0">
            <img
              src={movie.bannerUrl}
              alt={movie.title}
              className="w-full h-full object-cover object-center opacity-45 dark:opacity-20 scale-101"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/20 to-transparent dark:from-[#030712] dark:via-transparent dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-50/90 via-zinc-50/30 to-transparent dark:from-[#030712]/95 dark:via-[#030712]/40 dark:to-transparent" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-10 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-end w-full">
              {/* Floating poster card */}
              <div className="hidden md:block w-48 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 shadow-2xl relative translate-y-16">
                <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
              </div>

              {/* Title, rating and metrics */}
              <div className="space-y-4 pb-2 flex-1">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3.5 text-xs md:text-sm text-zinc-700 dark:text-zinc-300 font-semibold">
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4.5 h-4.5 fill-current" />
                    {movie.rating.toFixed(1)}/10
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-zinc-450" />
                    {movie.durationMins} mins
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Languages className="w-4 h-4 text-zinc-450" />
                    {movie.languages.map((ml) => ml.language.name).join(", ")}
                  </span>
                  <span>•</span>
                  <span className="px-3 py-1 rounded-full bg-zinc-200/60 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs text-zinc-750 dark:text-zinc-400">
                    {movie.genres.map((mg) => mg.genre.name).join(", ")}
                  </span>
                </div>

                {/* Client component containing trailer & favorite actions */}
                <MovieDetailsClient
                  movie={movie}
                  isFavoriteInitial={isFavorite}
                  userId={session?.user?.id || null}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-24 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Scheduling content */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Horizontal Date picker */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-zinc-200 dark:border-zinc-800 pb-5">
              {dateOptions.map((opt) => {
                const isSelected = opt.dateStr === date;
                return (
                  <Link
                    key={opt.dateStr}
                    href={`/movie/${movieId}?city=${city}&date=${opt.dateStr}`}
                    className={`flex flex-col items-center p-3.5 min-w-20 rounded-2xl border transition-all text-center cursor-pointer ${
                      isSelected
                        ? "bg-rose-600 border-rose-600 text-white scale-102 shadow-lg shadow-rose-555/20"
                        : "bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-450 hover:text-zinc-700 dark:hover:text-white"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">{opt.label}</span>
                    <span className="text-xl font-black mt-1.5 leading-none">{opt.dayNum}</span>
                    <span className="text-[9px] mt-1.5 font-semibold opacity-75">{opt.month}</span>
                  </Link>
                );
              })}
            </div>

            {/* List shows grouped by theatre */}
            <div className="space-y-6">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <MapPin className="w-5.5 h-5.5 text-rose-600" />
                <span>Showtimes in {city}</span>
              </h2>

              {theatresWithShows.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-850 p-6">
                  <p className="text-zinc-500 dark:text-zinc-450 text-sm font-medium">
                    No shows scheduled for {new Date(date).toLocaleDateString("en-US", { dateStyle: "long" })}.
                  </p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Try picking another date or selecting a different city.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {theatresWithShows.map((theatre: any) => (
                    <div
                      key={theatre.id}
                      className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex flex-col md:flex-row gap-6 items-start justify-between"
                    >
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 dark:text-white text-base">{theatre.name}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-450 font-medium">{theatre.address}</p>
                      </div>

                      <div className="flex flex-wrap gap-3.5 max-w-lg">
                        {theatre.shows.map((show: any) => {
                          const timeLabel = new Date(show.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <Link
                              key={show.id}
                              href={`/booking/${show.id}`}
                              className="px-4.5 py-3 bg-emerald-500/10 dark:bg-emerald-500/5 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-555/20 hover:border-emerald-555/40 hover:-translate-y-0.5 transition-all text-center cursor-pointer"
                            >
                              <div className="text-sm font-black">{timeLabel}</div>
                              <div className="text-[9px] opacity-80 font-semibold mt-0.5">{show.screenName}</div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cast & Crew Section */}
            {(cast.length > 0 || crew.length > 0) && (
              <div className="space-y-6 pt-4">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="w-5.5 h-5.5 text-rose-600" />
                  <span>Cast & Crew</span>
                </h2>

                <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
                  {/* Directors */}
                  {crew.map((member) => (
                    <div key={member.director.id} className="flex-none w-28 text-center space-y-2">
                      <div className="w-20 h-20 rounded-full overflow-hidden mx-auto bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <img
                          src={member.director.profileImageUrl || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200"}
                          alt={member.director.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{member.director.name}</p>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold uppercase">Director</p>
                      </div>
                    </div>
                  ))}

                  {/* Actors */}
                  {cast.map((member) => (
                    <div key={member.actor.id} className="flex-none w-28 text-center space-y-2">
                      <div className="w-20 h-20 rounded-full overflow-hidden mx-auto bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <img
                          src={member.actor.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"}
                          alt={member.actor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{member.actor.name}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate px-1">{member.characterName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Synopsis sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-white tracking-tight text-xs uppercase border-b border-zinc-100 dark:border-zinc-900 pb-2">Synopsis</h3>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm font-normal leading-relaxed">
                {movie.description}
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-3.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <h3 className="font-bold text-zinc-900 dark:text-white text-xs tracking-tight uppercase border-b border-zinc-100 dark:border-zinc-900 pb-2">Booking Details</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Seats are held in a pending state for a maximum of 5 minutes once selected.</li>
                <li>Make sure to double check date, time, and seat choices before checkout.</li>
                <li>All tickets are secure. E-tickets are sent automatically to your verified email address.</li>
              </ul>
            </div>
          </div>

        </section>

        {/* Similar Movies Recommendations Section */}
        {recommendations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-200 dark:border-zinc-850 py-16 space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                You Might <span className="text-rose-600">Also Like</span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                Similar movies sharing genres or languages
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/movie/${rec.id}?city=${city}`}
                  className="group flex flex-col space-y-3 cursor-pointer"
                >
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 relative shadow-xs group-hover:shadow-md transition-all duration-300">
                    <img
                      src={rec.posterUrl}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-350"
                    />
                    <div className="absolute top-3.5 right-3.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md flex items-center gap-1 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-white">
                        {rec.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 px-1">
                    <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-500 transition-colors text-sm line-clamp-1">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {rec.genres.map((mg) => mg.genre.name).join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
