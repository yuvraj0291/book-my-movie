"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Filter, ChevronDown, Check } from "lucide-react";
import { ShowFormat } from "@/types";

interface MovieFiltersProps {
  genres: string[];
  languages: string[];
  theatres: { id: string; name: string }[];
  city: string;
}

export function MovieFilters({ genres, languages, theatres, city }: MovieFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeGenres = searchParams.getAll("genres");
  const activeLanguages = searchParams.getAll("languages");
  const activeFormats = searchParams.getAll("formats") as ShowFormat[];
  const activeRating = searchParams.get("rating") || "";
  const activeTheatreId = searchParams.get("theatreId") || "";

  const updateParams = (key: string, value: string, isMulti: boolean = false) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (isMulti) {
      const currentValues = params.getAll(key);
      if (currentValues.includes(value)) {
        // Remove the value
        const updated = currentValues.filter((v) => v !== value);
        params.delete(key);
        updated.forEach((v) => params.append(key, v));
      } else {
        // Add the value
        params.append(key, value);
      }
    } else {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    
    // Reset page on filter change
    params.delete("page");
    
    router.push(`/movies?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    router.push(`/movies?${params.toString()}`);
  };

  const formats: ShowFormat[] = [ShowFormat.TWO_D, ShowFormat.THREE_D, ShowFormat.IMAX, ShowFormat.FOUR_DX];

  return (
    <div className="w-full lg:w-64 shrink-0 space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-900">
        <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-rose-600" />
          Filters
        </span>
        <button
          onClick={clearFilters}
          className="text-xs font-bold text-rose-650 hover:text-rose-500 transition-colors cursor-pointer"
        >
          Clear All
        </button>
      </div>

      {/* Genres Filter */}
      {genres.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Genres</h4>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {genres.map((genre) => {
              const isChecked = activeGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => updateParams("genres", genre, true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450"
                  }`}
                >
                  <span>{genre}</span>
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Languages Filter */}
      {languages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Languages</h4>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {languages.map((lang) => {
              const isChecked = activeLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => updateParams("languages", lang, true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450"
                  }`}
                >
                  <span>{lang}</span>
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Formats Filter */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Formats</h4>
        <div className="flex flex-wrap lg:flex-col gap-2">
          {formats.map((fmt) => {
            const isChecked = activeFormats.includes(fmt);
            const label = fmt === "TWO_D" ? "2D" : fmt === "THREE_D" ? "3D" : fmt === "IMAX" ? "IMAX" : "4DX";
            return (
              <button
                key={fmt}
                onClick={() => updateParams("formats", fmt, true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                  isChecked
                    ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450 font-bold"
                    : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450"
                }`}
              >
                <span>{label}</span>
                {isChecked && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ratings Filter */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Minimum Rating</h4>
        <div className="flex lg:flex-col gap-2">
          {[
            { label: "All Ratings", value: "" },
            { label: "★ 8.0 & above", value: "8" },
            { label: "★ 9.0 & above", value: "9" },
          ].map((item) => {
            const isChecked = activeRating === item.value;
            return (
              <button
                key={item.value}
                onClick={() => updateParams("rating", item.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                  isChecked
                    ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450 font-bold"
                    : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450"
                }`}
              >
                <span>{item.label}</span>
                {isChecked && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theatres Filter */}
      {theatres.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Theatres</h4>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
            {theatres.map((t) => {
              const isChecked = activeTheatreId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => updateParams("theatreId", isChecked ? "" : t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450"
                  }`}
                >
                  <span className="truncate pr-2">{t.name}</span>
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
