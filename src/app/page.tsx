import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getMoviesAction } from "@/app/actions/movieActions";
import { getTheatresInCityAction } from "@/app/actions/showActions";
import { HeroCarousel } from "@/components/domains/HeroCarousel";
import { HomeTabs } from "@/components/domains/HomeTabs";
import { PopularTheatres } from "@/components/domains/PopularTheatres";
import Link from "next/link";
import { Star, Flame, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city = "Mumbai" } = await searchParams;
  
  const [movies, theatres] = await Promise.all([
    getMoviesAction(),
    getTheatresInCityAction(city),
  ]);

  // Trending Movies (Top 5 Rated)
  const trendingMovies = [...movies]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return (
    <>
      <Header />
      
      <main className="flex-1 w-full pb-20 bg-zinc-50 dark:bg-[#030712] transition-colors duration-200">
        {/* Featured Hero Carousel */}
        <HeroCarousel movies={movies} city={city} />

        {/* Trending Ranking Row */}
        {trendingMovies.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-7 h-7 text-amber-500" />
                <span>Trending <span className="text-rose-600">Now</span></span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                The most rated and talked-about blockbusters this week
              </p>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 pt-2 no-scrollbar snap-x snap-mandatory">
              {trendingMovies.map((movie, index) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}?city=${city}`}
                  className="flex-none w-64 md:w-72 snap-start group relative flex items-end select-none cursor-pointer"
                >
                  {/* Huge Rank Number */}
                  <span className="absolute -left-3 bottom-0 text-[120px] md:text-[150px] font-black leading-none text-zinc-300 dark:text-zinc-800/60 select-none z-10 font-sans tracking-tighter transition-colors group-hover:text-rose-600/20">
                    {index + 1}
                  </span>

                  {/* Poster Card */}
                  <div className="ml-16 md:ml-20 w-full aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 shadow-md group-hover:shadow-xl group-hover:border-rose-500/30 transition-all duration-300 relative z-20">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                    />

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                      <h3 className="font-bold text-white text-sm md:text-base line-clamp-1">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{movie.rating.toFixed(1)}/10</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Now Showing / Coming Soon Tabbed Section */}
        <HomeTabs initialMovies={movies} city={city} />

        {/* Popular Theatres Section */}
        <PopularTheatres theatres={theatres} city={city} />
      </main>

      <Footer />
    </>
  );
}
