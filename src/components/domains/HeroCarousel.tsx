"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Clock, Languages, ChevronLeft, ChevronRight } from "lucide-react";
import { IMovieWithRelations } from "@/types";

interface HeroCarouselProps {
  movies: IMovieWithRelations[];
  city: string;
}

export function HeroCarousel({ movies, city }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  const featuredMovies = movies.slice(0, 5); // Take top 5 for carousel

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex, featuredMovies.length]);

  if (featuredMovies.length === 0) return null;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  const currentMovie = featuredMovies[currentIndex];

  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] bg-zinc-950 overflow-hidden border-b border-zinc-200/10 dark:border-white/5">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentMovie.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Banner Image */}
          <div className="absolute inset-0">
            <img
              src={currentMovie.bannerUrl}
              alt={currentMovie.title}
              className="w-full h-full object-cover object-center opacity-35 dark:opacity-20 scale-102"
            />
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/20 to-transparent dark:from-[#030712] dark:via-transparent dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-50/90 via-zinc-50/30 to-transparent dark:from-[#030712]/95 dark:via-[#030712]/40 dark:to-transparent" />
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-16 relative z-10">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold tracking-wider bg-rose-600/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full uppercase">
                Trending Blockbuster
              </span>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
                {currentMovie.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-700 dark:text-zinc-300 font-semibold">
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  {currentMovie.rating.toFixed(1)}/10
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-zinc-450" />
                  {currentMovie.durationMins} mins
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Languages className="w-4 h-4 text-zinc-450" />
                  {currentMovie.languages.map((ml) => ml.language.name).join(", ")}
                </span>
              </div>

              <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base line-clamp-3 leading-relaxed font-normal max-w-xl">
                {currentMovie.description}
              </p>

              <div className="pt-4">
                <Link
                  href={`/movie/${currentMovie.id}?city=${city}`}
                  className="inline-flex items-center px-7 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-xl shadow-rose-500/20 hover:scale-105 hover:-translate-y-0.5 cursor-pointer"
                >
                  Book Tickets Now
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {featuredMovies.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/20 dark:bg-black/30 text-zinc-800 dark:text-white hover:bg-white/40 dark:hover:bg-black/50 border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/20 dark:bg-black/30 text-zinc-800 dark:text-white hover:bg-white/40 dark:hover:bg-black/50 border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {featuredMovies.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {featuredMovies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-8 bg-rose-600 dark:bg-rose-500"
                  : "w-2 bg-zinc-400 dark:bg-zinc-750 hover:bg-zinc-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
