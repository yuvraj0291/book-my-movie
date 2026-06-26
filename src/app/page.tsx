import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { getMoviesAction } from "@/app/actions/movieActions";
import Link from "next/link";
import { Star, Clock, Languages } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; search?: string }>;
}) {
  const { city = "Mumbai", search = "" } = await searchParams;
  const movies = await getMoviesAction();

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch =
      !search ||
      movie.title.toLowerCase().includes(search.toLowerCase()) ||
      movie.genres.some((mg) => mg.genre.name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const featuredMovie = movies[0] || null;

  return (
    <>
      <Header />
      
      <main className="flex-1 w-full bg-[#030712] pb-16">
        {/* Featured Hero Banner */}
        {featuredMovie && (
          <section className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden border-b border-white/5">
            <div className="absolute inset-0">
              <img
                src={featuredMovie.bannerUrl}
                alt={featuredMovie.title}
                className="w-full h-full object-cover object-center opacity-30 blur-xs"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 via-[#030712]/40 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 relative z-10">
              <div className="max-w-2xl space-y-4">
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                  TRENDING NOW
                </span>
                
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                  {featuredMovie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300 font-light">
                  <span className="flex items-center gap-1 text-yellow-500 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    {featuredMovie.rating.toFixed(1)}/10
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredMovie.durationMins} mins
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Languages className="w-4 h-4" />
                    {featuredMovie.languages.map((ml) => ml.language.name).join(", ")}
                  </span>
                </div>

                <p className="text-zinc-400 font-light text-sm md:text-base line-clamp-3 leading-relaxed">
                  {featuredMovie.description}
                </p>

                <div className="pt-4">
                  <Link
                    href={`/movie/${featuredMovie.id}?city=${city}`}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 hover:scale-102 hover:-translate-y-0.5"
                  >
                    Book Tickets Now
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Movies Grid Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Recommended Movies in <span className="text-primary">{city}</span>
              </h2>
              <p className="text-zinc-500 text-xs mt-1 font-light">Explore active cinematic blockbusters scheduled near you</p>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="px-3 py-1.5 rounded-full text-xs bg-primary text-white font-semibold cursor-pointer">
                All
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                Action
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                Drama
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                Sci-Fi
              </span>
            </div>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="text-center py-20 bg-white/3 rounded-2xl border border-white/5">
              <p className="text-zinc-400 text-lg">No movies found matching your search.</p>
              <p className="text-zinc-600 text-xs mt-1 font-light">Try another search query or check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMovies.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}?city=${city}`}
                  className="group flex flex-col space-y-3 cursor-pointer"
                >
                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden glass border border-white/5 relative card-glow">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/75 backdrop-blur-xs flex items-center gap-1 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-white">
                        {movie.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 px-1">
                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors line-clamp-1 text-sm">
                      {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-light">
                      <span className="truncate max-w-[100px]">{movie.genres.map((mg) => mg.genre.name).join(", ")}</span>
                      <span>•</span>
                      <span className="truncate max-w-[70px]">{movie.languages.map((ml) => ml.language.name).join(", ")}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
