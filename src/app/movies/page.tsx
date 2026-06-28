import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getDiscoveryMoviesAction, getFilterOptionsAction } from "@/app/actions/movieActions";
import { MovieFilters } from "@/components/domains/MovieFilters";
import Link from "next/link";
import { Star, Clock, Languages, Calendar, SlidersHorizontal, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ShowFormat } from "@/types";

export const dynamic = "force-dynamic";

interface DiscoveryPageProps {
  searchParams: Promise<{
    city?: string;
    search?: string;
    genres?: string | string[];
    languages?: string | string[];
    formats?: string | string[];
    rating?: string;
    theatreId?: string;
    status?: "now-showing" | "coming-soon" | "all";
    sortBy?: "rating" | "releaseDate" | "duration";
    sortOrder?: "asc" | "desc";
    page?: string;
  }>;
}

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const resolvedParams = await searchParams;

  const city = resolvedParams.city || "Mumbai";
  const search = resolvedParams.search || "";
  const rating = resolvedParams.rating ? Number(resolvedParams.rating) : undefined;
  const theatreId = resolvedParams.theatreId || undefined;
  const status = resolvedParams.status || "all";
  const sortBy = resolvedParams.sortBy || "releaseDate";
  const sortOrder = resolvedParams.sortOrder || "desc";
  const currentPage = resolvedParams.page ? Number(resolvedParams.page) : 1;
  const limit = 10;

  // Helper to ensure parameter is array
  const toArray = <T extends string>(val: any): T[] | undefined => {
    if (!val) return undefined;
    return (Array.isArray(val) ? val : [val]) as T[];
  };

  const genres = toArray<string>(resolvedParams.genres);
  const languages = toArray<string>(resolvedParams.languages);
  const formats = toArray<ShowFormat>(resolvedParams.formats);

  // Fetch movies and filters in parallel
  const [moviesData, filterOptions] = await Promise.all([
    getDiscoveryMoviesAction({
      city,
      search,
      genres,
      languages,
      formats,
      rating,
      theatreId,
      status,
      sortBy,
      sortOrder,
      page: currentPage,
      limit,
    }),
    getFilterOptionsAction(city),
  ]);

  const { movies, total } = moviesData;
  const totalPages = Math.ceil(total / limit);

  // Helper to build URL with modified query
  const getSortUrl = (newSortBy: string) => {
    const params = new URLSearchParams();
    // Copy all current params
    Object.entries(resolvedParams).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((v) => params.append(key, v));
      } else if (val) {
        params.set(key, val);
      }
    });
    params.set("sortBy", newSortBy);
    params.set("sortOrder", "desc");
    params.delete("page"); // Reset pagination
    return `/movies?${params.toString()}`;
  };

  const getPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedParams).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((v) => params.append(key, v));
      } else if (val) {
        params.set(key, val);
      }
    });
    params.set("page", String(pageNumber));
    return `/movies?${params.toString()}`;
  };

  return (
    <>
      <Header />

      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] py-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                Explore Movies in <span className="text-rose-600">{city}</span>
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                {search ? `Showing ${total} results for "${search}"` : `Discover ${total} movies matching your preferences`}
              </p>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Sort By:
              </span>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250/10 dark:border-zinc-800 text-xs font-bold">
                <Link
                  href={getSortUrl("releaseDate")}
                  className={`px-3.5 py-2 rounded-lg transition-all ${
                    sortBy === "releaseDate"
                      ? "bg-white dark:bg-zinc-950 text-rose-600 dark:text-rose-450 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  Latest
                </Link>
                <Link
                  href={getSortUrl("rating")}
                  className={`px-3.5 py-2 rounded-lg transition-all ${
                    sortBy === "rating"
                      ? "bg-white dark:bg-zinc-950 text-rose-600 dark:text-rose-450 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  Rating
                </Link>
                <Link
                  href={getSortUrl("duration")}
                  className={`px-3.5 py-2 rounded-lg transition-all ${
                    sortBy === "duration"
                      ? "bg-white dark:bg-zinc-950 text-rose-600 dark:text-rose-450 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  Duration
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Split */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Sidebar Filters */}
            <MovieFilters
              genres={filterOptions.genres}
              languages={filterOptions.languages}
              theatres={filterOptions.theatres}
              city={city}
            />

            {/* Results Grid */}
            <div className="flex-1 w-full space-y-10">
              {movies.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-850 p-6 space-y-4">
                  <div className="w-16 h-16 bg-rose-550/10 text-rose-600 dark:text-rose-450 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Movies Found</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-450 max-w-md mx-auto leading-relaxed">
                      We couldn't find any movies matching your current filters. Try resetting them or searching for something else.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/movies?city=${city}`}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors inline-block"
                    >
                      Reset All Filters
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {movies.map((movie) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}?city=${city}`}
                        className="group flex flex-col space-y-3.5 cursor-pointer"
                      >
                        <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 relative shadow-xs hover:shadow-md transition-all duration-300">
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />
                          
                          {/* Rating Badge */}
                          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md flex items-center gap-1 border border-white/10">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                            <span className="text-xs font-bold text-white">
                              {movie.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 px-1">
                          <h3 className="font-bold text-zinc-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-500 transition-colors line-clamp-1 text-sm md:text-base">
                            {movie.title}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            <span className="truncate max-w-[120px]">
                              {movie.genres.map((mg) => mg.genre.name).join(", ")}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[80px]">
                              {movie.languages.map((ml) => ml.language.name).join(", ")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6 border-t border-zinc-200 dark:border-zinc-850">
                      {/* Prev Button */}
                      <Link
                        href={getPageUrl(currentPage - 1)}
                        className={`p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center justify-center ${
                          currentPage === 1
                            ? "pointer-events-none opacity-40"
                            : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        }`}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Link>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === currentPage;
                        return (
                          <Link
                            key={p}
                            href={getPageUrl(p)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm border transition-all ${
                              isActive
                                ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/10"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            }`}
                          >
                            {p}
                          </Link>
                        );
                      })}

                      {/* Next Button */}
                      <Link
                        href={getPageUrl(currentPage + 1)}
                        className={`p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center justify-center ${
                          currentPage === totalPages
                            ? "pointer-events-none opacity-40"
                            : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        }`}
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
