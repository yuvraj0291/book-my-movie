"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Flame, Calendar, ArrowRight } from "lucide-react";
import { IMovieWithRelations } from "@/types";

interface HomeTabsProps {
  initialMovies: IMovieWithRelations[];
  city: string;
}

type TabType = "now-showing" | "coming-soon";

export function HomeTabs({ initialMovies, city }: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("now-showing");
  const [visibleCount, setVisibleCount] = useState(10);

  const now = new Date();

  // Split movies by release date
  const categorizedMovies = useMemo(() => {
    const nowShowing: IMovieWithRelations[] = [];
    const comingSoon: IMovieWithRelations[] = [];

    initialMovies.forEach((movie) => {
      const releaseDate = new Date(movie.releaseDate);
      if (releaseDate <= now) {
        nowShowing.push(movie);
      } else {
        comingSoon.push(movie);
      }
    });

    return { nowShowing, comingSoon };
  }, [initialMovies]);

  const activeMovies = activeTab === "now-showing" ? categorizedMovies.nowShowing : categorizedMovies.comingSoon;
  const displayedMovies = activeMovies.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };


  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-8">
      {/* Header and Tab Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Movie <span className="text-rose-600">Discovery</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Discover active cinematic blockbusters scheduled in <span className="text-rose-600 font-bold">{city}</span>
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-250/10 dark:border-zinc-800 self-start">
          <button
            onClick={() => {
              setActiveTab("now-showing");
              setVisibleCount(10);
            }}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "now-showing"
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {activeTab === "now-showing" && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 bg-rose-600 rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Now Showing
            </span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("coming-soon");
              setVisibleCount(10);
            }}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "coming-soon"
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {activeTab === "coming-soon" && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 bg-rose-600 rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Coming Soon
            </span>
          </button>
        </div>
      </div>

      {/* Movies Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
        >
          {displayedMovies.length === 0 ? (
            <div className="col-span-full text-center py-24 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium">No movies in this category.</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Check back later or change your selected city!</p>
            </div>
          ) : (
            displayedMovies.map((movie) => (
              <motion.div key={movie.id} variants={itemVariants}>
                <Link
                  href={`/movie/${movie.id}?city=${city}`}
                  className="group flex flex-col space-y-3.5 cursor-pointer"
                >
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 relative shadow-md group-hover:shadow-xl transition-all duration-350">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-3.5 right-3.5 px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md flex items-center gap-1 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-white">
                        {movie.rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Quick Booking Hover Sheet */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                      <span className="px-5 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-350 ease-out flex items-center gap-1.5">
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1.5">
                    <h3 className="font-bold text-zinc-850 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-500 transition-colors line-clamp-1 text-sm md:text-base">
                      {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      <span className="truncate max-w-[110px]">
                        {movie.genres.map((mg) => mg.genre.name).join(", ")}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[80px]">
                        {movie.languages.map((ml) => ml.language.name).join(", ")}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* Load More Button */}
      {activeMovies.length > visibleCount && (
        <div className="flex justify-center pt-6">
          <button
            onClick={handleLoadMore}
            className="px-8 py-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-250/10 dark:border-zinc-800 transition-all cursor-pointer"
          >
            Load More Movies
          </button>
        </div>
      )}
    </section>
  );
}
