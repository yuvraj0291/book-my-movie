"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Film, ArrowRight } from "lucide-react";

interface TheatreWithScreens {
  id: string;
  name: string;
  address: string;
  screens: any[];
}

interface PopularTheatresProps {
  theatres: TheatreWithScreens[];
  city: string;
}

export function PopularTheatres({ theatres, city }: PopularTheatresProps) {
  if (theatres.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 space-y-8">
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          Popular <span className="text-rose-600">Theatres</span>
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
          Top-rated cinema halls and multiplexes in <span className="text-rose-600 font-bold">{city}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {theatres.map((theatre) => (
          <div
            key={theatre.id}
            className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-rose-500/30 dark:hover:border-rose-500/30 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-bold text-zinc-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-500 transition-colors text-lg">
                  {theatre.name}
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800 px-2.5 py-1 rounded-full shrink-0">
                  <Film className="w-3.5 h-3.5 text-rose-600" />
                  <span>{theatre.screens.length} Screens</span>
                </div>
              </div>

              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed flex items-start gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>{theatre.address}</span>
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
              <Link
                href={`/movies?city=${city}&theatreId=${theatre.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 transition-colors"
              >
                <span>View Shows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
