"use client";

import React, { useState } from "react";
import { createMovieAction } from "@/app/actions/movieActions";
import { createTheatreAction, scheduleShowAction } from "@/app/actions/adminActions";
import { Film, MapPin, Calendar, Plus, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Movie } from "@prisma/client";

interface AdminDashboardProps {
  initialMovies: Movie[];
  initialTheatres: Array<{
    id: string;
    name: string;
    city: string;
    screens: Array<{ id: string; name: string }>;
  }>;
}

export function AdminDashboard({ initialMovies, initialTheatres }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"movies" | "theatres" | "shows">("movies");
  
  const [movies, setMovies] = useState(initialMovies);
  const [theatres, setTheatres] = useState(initialTheatres);

  const [movieStatus, setMovieStatus] = useState<{ error?: string; success?: string }>({});
  const [theatreStatus, setTheatreStatus] = useState<{ error?: string; success?: string }>({});
  const [showStatus, setShowStatus] = useState<{ error?: string; success?: string }>({});

  const handleMovieSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMovieStatus({});
    const formData = new FormData(e.currentTarget);
    
    const releaseDateStr = formData.get("releaseDate") as string;
    const durationMinsStr = formData.get("durationMins") as string;
    const ratingStr = formData.get("rating") as string;

    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      posterUrl: formData.get("posterUrl") as string,
      bannerUrl: formData.get("bannerUrl") as string,
      durationMins: parseInt(durationMinsStr),
      language: formData.get("language") as string,
      genre: formData.get("genre") as string,
      releaseDate: new Date(releaseDateStr),
      rating: parseFloat(ratingStr),
    };

    const res = await createMovieAction(data);
    if ("error" in res) {
      setMovieStatus({ error: res.error });
    } else if (res.success && res.movie) {
      setMovieStatus({ success: "Movie added successfully!" });
      setMovies((prev) => [res.movie!, ...prev]);
      e.currentTarget.reset();
    }
  };

  const handleTheatreSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTheatreStatus({});
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const address = formData.get("address") as string;

    const res = await createTheatreAction(name, city, address);
    if ("error" in res) {
      setTheatreStatus({ error: res.error });
    } else if (res.success) {
      setTheatreStatus({ success: "Theatre and screen mapping generated!" });
      setTheatres((prev: any) => [
        { id: res.theatreId, name, city, screens: [{ name: "Screen 1" }] },
        ...prev,
      ]);
      e.currentTarget.reset();
    }
  };

  const handleShowSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowStatus({});
    const formData = new FormData(e.currentTarget);
    
    const movieId = formData.get("movieId") as string;
    const screenId = formData.get("screenId") as string;
    const startTime = formData.get("startTime") as string;
    const basePrice = parseFloat(formData.get("basePrice") as string);

    const res = await scheduleShowAction(movieId, screenId, startTime, basePrice);
    if ("error" in res) {
      setShowStatus({ error: res.error });
    } else if (res.success) {
      setShowStatus({ success: "Show scheduled and seat maps generated!" });
      e.currentTarget.reset();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Operations Portal</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage movies, theatres, screens, and show times.</p>
      </div>

      <div className="flex border-b border-white/5 bg-zinc-950 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab("movies")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "movies" ? "bg-primary text-white font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Add Movie</span>
        </button>
        <button
          onClick={() => setActiveTab("theatres")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "theatres" ? "bg-primary text-white font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Add Theatre</span>
        </button>
        <button
          onClick={() => setActiveTab("shows")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "shows" ? "bg-primary text-white font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule Show</span>
        </button>
      </div>

      <div className="p-8 rounded-2xl glass border border-white/5 relative overflow-hidden">
        
        {activeTab === "movies" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <span>Add Movie metadata</span>
            </h2>

            <form onSubmit={handleMovieSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movieStatus.error && <div className="col-span-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{movieStatus.error}</div>}
              {movieStatus.success && <div className="col-span-full p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{movieStatus.success}</div>}

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-semibold text-zinc-400">Movie Title</label>
                <input name="title" type="text" required placeholder="Gladiator II" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-semibold text-zinc-400">Synopsis</label>
                <textarea name="description" required rows={3} placeholder="Provide a brief summary..." className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Poster URL</label>
                <input name="posterUrl" type="url" required placeholder="https://..." className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Banner URL</label>
                <input name="bannerUrl" type="url" required placeholder="https://..." className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Genre</label>
                <input name="genre" type="text" required placeholder="Action, Drama, History" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Language</label>
                <input name="language" type="text" required placeholder="English, Hindi" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Duration (Minutes)</label>
                <input name="durationMins" type="number" required placeholder="148" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Rating (Out of 10)</label>
                <input name="rating" type="number" step="0.1" required placeholder="8.4" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-semibold text-zinc-400">Release Date</label>
                <input name="releaseDate" type="date" required className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" />
              </div>

              <button type="submit" className="col-span-full mt-4 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 cursor-pointer">
                Create Movie Record
              </button>
            </form>
          </div>
        )}

        {activeTab === "theatres" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <span>Create Theatre & Seat Map</span>
            </h2>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs flex gap-2 items-start">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Creating a theatre automatically initiates a default screen ("Screen 1") pre-configured with a 40-seat standard layout (5 rows A-E, 8 seats per row).</span>
            </div>

            <form onSubmit={handleTheatreSubmit} className="space-y-4">
              {theatreStatus.error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{theatreStatus.error}</div>}
              {theatreStatus.success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{theatreStatus.success}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Theatre Name</label>
                <input name="name" type="text" required placeholder="PVR ICON Versova" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">City</label>
                  <select name="city" required className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50">
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Pune">Pune</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Detailed Address</label>
                  <input name="address" type="text" required placeholder="Laxmi Industrial Estate, Andheri West" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
                </div>
              </div>

              <button type="submit" className="w-full mt-4 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 cursor-pointer">
                Create Theatre & Generate Grid
              </button>
            </form>
          </div>
        )}

        {activeTab === "shows" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <span>Schedule Show timeslot</span>
            </h2>

            <form onSubmit={handleShowSubmit} className="space-y-4">
              {showStatus.error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{showStatus.error}</div>}
              {showStatus.success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{showStatus.success}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Select Movie</label>
                <select name="movieId" required className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50">
                  <option value="">Choose a movie...</option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>{m.title} ({m.language})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Select Theatre Screen</label>
                <select name="screenId" required className="w-full bg-zinc-900 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50">
                  <option value="">Choose a theatre screen...</option>
                  {theatres.map((t: any) =>
                    t.screens.map((s: any) => (
                      <option key={s.id} value={s.id}>{t.name} - {s.name} ({t.city})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Start Time</label>
                  <input name="startTime" type="datetime-local" required className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Base Price (USD)</label>
                  <input name="basePrice" type="number" step="0.01" required placeholder="10.00" className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-500" />
                </div>
              </div>

              <button type="submit" className="w-full mt-4 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 cursor-pointer">
                Schedule Show & Allocate Seats
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
