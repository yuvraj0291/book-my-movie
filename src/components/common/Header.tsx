"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Film, MapPin, Search, User, LogOut, Ticket, Settings, Sun, Moon, X } from "lucide-react";
import { Role } from "@/types";
import { useTheme } from "./ThemeProvider";
import { getMovieSuggestionsAction, getCitiesAction } from "@/app/actions/movieActions";

const POPULAR_CITIES = [
  { name: "Mumbai", code: "BOM" },
  { name: "Delhi", code: "DEL" },
  { name: "Bengaluru", code: "BLR" },
  { name: "Hyderabad", code: "HYD" },
  { name: "Chennai", code: "MAA" },
  { name: "Kolkata", code: "CCU" },
  { name: "Pune", code: "PNQ" },
];

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();

  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Modals / Dropdowns
  const [showCityModal, setShowCityModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Cities database list
  const [allCities, setAllCities] = useState<any[]>([]);
  const [citySearch, setCitySearch] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load selected city
  useEffect(() => {
    const cityParam = searchParams.get("city");
    if (cityParam) {
      setSelectedCity(cityParam);
    } else {
      const savedCity = localStorage.getItem("selectedCity");
      if (savedCity) {
        setSelectedCity(savedCity);
      }
    }
  }, [searchParams]);

  // Load all cities from database for the selector
  useEffect(() => {
    const fetchCities = async () => {
      const cities = await getCitiesAction();
      setAllCities(cities);
    };
    fetchCities();
  }, []);

  // Debounced movie suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const results = await getMovieSuggestionsAction(searchQuery, selectedCity);
      setSuggestions(results);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCity]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    localStorage.setItem("selectedCity", cityName);
    setShowCityModal(false);
    setCitySearch("");

    const params = new URLSearchParams(searchParams.toString());
    params.set("city", cityName);
    router.push(`/?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    setShowMobileSearch(false);

    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
      router.push(`/movies?${params.toString()}`);
    } else {
      params.delete("search");
      router.push(`/movies?${params.toString()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        const selectedMovie = suggestions[activeIndex];
        router.push(`/movie/${selectedMovie.id}?city=${selectedCity}`);
        setSearchQuery("");
        setSuggestions([]);
        setIsSearchFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsSearchFocused(false);
    }
  };

  const filteredCities = allCities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-[#030712]/80 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href={`/?city=${selectedCity}`} className="flex items-center gap-2 group shrink-0">
            <div className="bg-rose-600 p-2 rounded-xl text-white group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              Movie<span className="text-rose-600">Rocks</span>
            </span>
          </Link>

          {/* City Selector trigger */}
          <button
            onClick={() => setShowCityModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-850 transition-all text-sm font-semibold"
          >
            <MapPin className="w-4 h-4 text-rose-600" />
            <span>{selectedCity}</span>
          </button>

          {/* Desktop Search Bar with Autocomplete */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search for movies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleKeyDown}
                className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-5 py-2.5 pl-11 rounded-full border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
            </form>

            {/* Autocomplete Suggestions Dropdown */}
            {isSearchFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {suggestions.map((movie, idx) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}?city=${selectedCity}`}
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                      setIsSearchFocused(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      idx === activeIndex
                        ? "bg-zinc-100 dark:bg-zinc-900 text-rose-600"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-8 h-12 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{movie.title}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {movie.genres.join(", ")}
                      </p>
                    </div>
                    <div className="text-xs font-bold text-yellow-500">
                      ★ {movie.rating.toFixed(1)}
                    </div>
                  </Link>
                ))}
                <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1.5 px-4">
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-bold text-rose-600 hover:text-rose-500"
                  >
                    Press Enter to view all results
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Trigger */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-600" />}
            </button>

            {/* User Profile Dropdown */}
            <div ref={profileRef} className="relative">
              {status === "authenticated" && session?.user ? (
                <>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold hover:border-rose-500 transition-all cursor-pointer">
                      {session.user.name ? session.user.name[0].toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-2xl overflow-hidden py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-850">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{session.user.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{session.user.email}</p>
                      </div>

                      <Link
                        href="/bookings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <Ticket className="w-4.5 h-4.5 text-rose-600" />
                        <span>My Bookings</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <Settings className="w-4.5 h-4.5 text-emerald-500" />
                        <span>Account Settings</span>
                      </Link>

                      {session.user.role === Role.ADMIN && (
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <Settings className="w-4.5 h-4.5 text-indigo-500" />
                          <span>Admin Portal</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          signOut({ callbackUrl: "/" });
                          setShowProfileDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left border-t border-zinc-100 dark:border-zinc-850"
                      >
                        <LogOut className="w-4.5 h-4.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/20 hover:scale-102"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 p-4 flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-3 pl-10 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none"
              />
              <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-zinc-400" />
            </form>
            <button
              onClick={() => {
                setShowMobileSearch(false);
                setSearchQuery("");
              }}
              className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Suggestions in mobile */}
          {suggestions.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-2 mt-2">
              {suggestions.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}?city=${selectedCity}`}
                  onClick={() => {
                    setSearchQuery("");
                    setSuggestions([]);
                    setShowMobileSearch(false);
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-10 h-14 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{movie.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{movie.genres.join(", ")}</p>
                  </div>
                  <div className="text-xs font-bold text-yellow-500">★ {movie.rating.toFixed(1)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-City Selector Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-850 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Select Your City</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Choose your city to explore tailored showtimes and bookings</p>
              </div>
              <button
                onClick={() => {
                  setShowCityModal(false);
                  setCitySearch("");
                }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Search city */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for your city..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-5 py-3 pl-12 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
                <Search className="absolute left-4 top-4.5 w-4.5 h-4.5 text-zinc-400" />
              </div>

              {/* Popular Cities Grid */}
              {!citySearch && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Popular Cities</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {POPULAR_CITIES.map((city) => (
                      <button
                        key={city.name}
                        onClick={() => handleCityChange(city.name)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group cursor-pointer ${
                          selectedCity === city.name
                            ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                            : "bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-250/10 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        <span className="w-10 h-10 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform mb-2">
                          {city.code}
                        </span>
                        <span className="text-xs font-semibold">{city.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Cities matching Search */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {citySearch ? "Matching Cities" : "All Cities"}
                </h4>
                {filteredCities.length === 0 ? (
                  <p className="text-zinc-500 text-sm italic">No cities found matching "{citySearch}"</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredCities.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleCityChange(city.name)}
                        className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                          selectedCity === city.name
                            ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                            : "bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-250/10 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {city.name}, {city.state}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
