"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Film, MapPin, Search, User, LogOut, Ticket, Settings } from "lucide-react";
import { Role } from "@prisma/client";

const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune"];

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    // Load city from URL query, localStorage, or default
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

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem("selectedCity", city);
    setShowCityDropdown(false);
    
    // Update the URL search params dynamically
    const params = new URLSearchParams(searchParams.toString());
    params.set("city", city);
    router.push(`/?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass shadow-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Branding Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="bg-primary p-2 rounded-lg text-white group-hover:scale-105 transition-transform">
            <Film className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
            Movie<span className="text-primary">Rocks</span>
          </span>
        </Link>

        {/* Location Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all text-sm"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>{selectedCity}</span>
          </button>
          
          {showCityDropdown && (
            <div className="absolute left-0 mt-2 w-48 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityChange(city)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors ${
                    selectedCity === city ? "text-primary bg-primary/5 font-semibold" : "text-zinc-400"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Search for movies, genres, or languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 text-zinc-200 placeholder-zinc-500 text-sm px-4 py-2 pl-10 rounded-full border border-white/5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
        </form>

        {/* Authentication Options */}
        <div className="relative flex items-center gap-4">
          {status === "authenticated" && session?.user ? (
            <>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 focus:outline-none group"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold group-hover:border-primary transition-all">
                  {session.user.name ? session.user.name[0].toUpperCase() : <User className="w-4 h-4" />}
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-44 w-52 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
                  </div>

                  <Link
                    href="/bookings"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Ticket className="w-4 h-4 text-primary" />
                    <span>My Bookings</span>
                  </Link>

                  {session.user.role === Role.ADMIN && (
                    <Link
                      href="/admin"
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-indigo-400" />
                      <span>Admin Portal</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left border-t border-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white font-medium text-sm transition-all shadow-md shadow-primary/20 hover:scale-102"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
