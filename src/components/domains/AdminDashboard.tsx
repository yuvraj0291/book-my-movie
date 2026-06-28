"use client";

import React, { useState, useEffect } from "react";
import { createMovieAction } from "@/app/actions/movieActions";
import {
  createTheatreAction,
  updateTheatreAction,
  deleteTheatreAction,
  getOwnerTheatresAction,
  approveTheatreAction,
  createScreenAction,
  saveScreenLayoutAction,
  deleteScreenAction,
  scheduleShowWithConflictCheckAction,
  getShowStatsAction,
  cancelShowAction,
} from "@/app/actions/theatreActions";
import {
  Film,
  MapPin,
  Calendar,
  Plus,
  Info,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Check,
  X,
  User,
  Activity,
  Grid,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  Navigation,
} from "lucide-react";
import { Role, ShowFormat, SeatType } from "@prisma/client";
import { IMovieWithRelations } from "@/types";

interface AdminDashboardProps {
  initialMovies: IMovieWithRelations[];
  initialTheatres: any[];
  initialPendingTheatres: any[];
  languages: any[];
  role: Role;
}

export function AdminDashboard({
  initialMovies,
  initialTheatres,
  initialPendingTheatres,
  languages,
  role,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"movies" | "theatres" | "shows" | "approvals">("movies");
  
  const [movies, setMovies] = useState(initialMovies);
  const [theatres, setTheatres] = useState(initialTheatres);
  const [pendingTheatres, setPendingTheatres] = useState(initialPendingTheatres);

  // Status messages
  const [movieStatus, setMovieStatus] = useState<{ error?: string; success?: string }>({});
  const [theatreStatus, setTheatreStatus] = useState<{ error?: string; success?: string }>({});
  const [showStatus, setShowStatus] = useState<{ error?: string; success?: string }>({});

  // Active items for detail views
  const [selectedTheatre, setSelectedTheatre] = useState<any | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<any | null>(null);

  // Seat Layout Designer State
  const [designerRows, setDesignerRows] = useState(8);
  const [designerCols, setDesignerCols] = useState(10);
  const [designerGrid, setDesignerGrid] = useState<any[][]>([]);
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType>("NORMAL");
  const [designerMode, setDesignerMode] = useState<"toggle-active" | "paint-type">("toggle-active");
  const [designerStatus, setDesignerStatus] = useState<{ error?: string; success?: string }>({});

  // Show stats state
  const [showStats, setShowStats] = useState<Record<string, any>>({});

  // Update tabs based on role
  useEffect(() => {
    if (role === Role.ADMIN) {
      setActiveTab("approvals");
    } else {
      setActiveTab("theatres");
    }
  }, [role]);

  // Load theatre list
  const refreshTheatres = async () => {
    const data = await getOwnerTheatresAction();
    setTheatres(data);
    if (selectedTheatre) {
      const updated = data.find((t) => t.id === selectedTheatre.id);
      setSelectedTheatre(updated || null);
    }
  };

  // Initialize Designer Grid
  const openDesigner = (screen: any) => {
    setSelectedScreen(screen);
    setDesignerStatus({});
    
    if (screen.seatLayout) {
      try {
        const layout = JSON.parse(screen.seatLayout);
        setDesignerRows(layout.rows || screen.rowsCount);
        setDesignerCols(layout.cols || screen.colsCount);
        setDesignerGrid(layout.grid);
        return;
      } catch (e) {
        console.error("Failed to parse seat layout JSON, generating default");
      }
    }

    // Default Grid Generation
    const rows = screen.rowsCount || 8;
    const cols = screen.colsCount || 10;
    setDesignerRows(rows);
    setDesignerCols(cols);
    generateDefaultGrid(rows, cols);
  };

  const generateDefaultGrid = (rows: number, cols: number) => {
    const grid = Array.from({ length: rows }, (_, r) => {
      const rowLetter = String.fromCharCode(65 + r);
      return Array.from({ length: cols }, (_, c) => ({
        row: rowLetter,
        number: c + 1,
        type: "NORMAL",
        active: true,
      }));
    });
    setDesignerGrid(grid);
  };

  // Auto-recalculate seat numbering in a row based on active seats
  const recalculateGridNumbering = (grid: any[][]) => {
    return grid.map((rowArray) => {
      let seatNum = 1;
      return rowArray.map((cell) => {
        if (cell.active) {
          return { ...cell, number: seatNum++ };
        }
        return { ...cell, number: null };
      });
    });
  };

  const handleCellClick = (r: number, c: number) => {
    const newGrid = [...designerGrid];
    const cell = newGrid[r][c];

    if (designerMode === "toggle-active") {
      newGrid[r][c] = { ...cell, active: !cell.active };
    } else {
      // Paint type
      newGrid[r][c] = { ...cell, type: selectedSeatType, active: true };
    }

    const recalculated = recalculateGridNumbering(newGrid);
    setDesignerGrid(recalculated);
  };

  const handleApplyRowType = (r: number, type: SeatType) => {
    const newGrid = [...designerGrid];
    newGrid[r] = newGrid[r].map((cell) => ({
      ...cell,
      type,
      active: true,
    }));
    const recalculated = recalculateGridNumbering(newGrid);
    setDesignerGrid(recalculated);
  };

  const handleSaveLayout = async () => {
    if (!selectedScreen) return;
    setDesignerStatus({});
    
    const layoutJson = JSON.stringify({
      rows: designerRows,
      cols: designerCols,
      grid: designerGrid,
    });

    const res = await saveScreenLayoutAction(
      selectedScreen.id,
      designerRows,
      designerCols,
      layoutJson
    );

    if ("error" in res) {
      setDesignerStatus({ error: res.error });
    } else if ("success" in res) {
      setDesignerStatus({ success: "Seat layout saved successfully!" });
      refreshTheatres();
    }
  };

  // Movie CRUD submit
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

  // Create Theatre
  const handleTheatreSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTheatreStatus({});
    const formData = new FormData(e.currentTarget);
    
    const lat = formData.get("latitude") as string;
    const lng = formData.get("longitude") as string;

    const data = {
      name: formData.get("name") as string,
      city: formData.get("city") as string,
      address: formData.get("address") as string,
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lng ? parseFloat(lng) : undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      contactEmail: formData.get("contactEmail") as string || undefined,
    };

    const res = await createTheatreAction(data);
    if ("error" in res) {
      setTheatreStatus({ error: res.error });
    } else if ("success" in res) {
      setTheatreStatus({
        success: res.approved
          ? "Theatre created and approved successfully!"
          : "Theatre created and pending Admin approval.",
      });
      refreshTheatres();
      e.currentTarget.reset();
    }
  };

  // Add Screen
  const handleAddScreen = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTheatre) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get("screenName") as string;
    const rows = parseInt(formData.get("rows") as string);
    const cols = parseInt(formData.get("cols") as string);

    const res = await createScreenAction(selectedTheatre.id, name, rows, cols);
    if ("error" in res) {
      alert(res.error);
    } else {
      refreshTheatres();
      e.currentTarget.reset();
    }
  };

  // Delete Screen
  const handleDeleteScreen = async (screenId: string) => {
    if (confirm("Are you sure you want to delete this screen? All seats will be deleted.")) {
      const res = await deleteScreenAction(screenId);
      if (res.error) {
        alert(res.error);
      } else {
        refreshTheatres();
      }
    }
  };

  // Schedule Show (Conflict Check)
  const handleShowSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowStatus({});
    const formData = new FormData(e.currentTarget);
    
    const movieId = formData.get("movieId") as string;
    const screenId = formData.get("screenId") as string;
    const startTimeString = formData.get("startTime") as string;
    const basePrice = parseFloat(formData.get("basePrice") as string);
    const format = formData.get("format") as ShowFormat;
    const languageId = formData.get("languageId") as string;

    const res = await scheduleShowWithConflictCheckAction({
      movieId,
      screenId,
      startTimeString,
      format,
      languageId,
      subtitleLanguageId: null,
      basePrice,
    });

    if ("error" in res) {
      setShowStatus({ error: res.error });
    } else if ("success" in res) {
      setShowStatus({ success: "Show scheduled successfully with conflict-free timings!" });
      refreshTheatres();
      e.currentTarget.reset();
    }
  };

  // Approve Theatre
  const handleApproveTheatre = async (theatreId: string, approve: boolean) => {
    const res = await approveTheatreAction(theatreId, approve);
    if ("error" in res) {
      alert(res.error);
    } else {
      setPendingTheatres((prev) => prev.filter((t) => t.id !== theatreId));
      refreshTheatres();
    }
  };

  // Fetch show stats on click
  const fetchShowStats = async (showId: string) => {
    const stats = await getShowStatsAction(showId);
    if (stats) {
      setShowStats((prev) => ({ ...prev, [showId]: stats }));
    }
  };

  // Cancel Show
  const handleCancelShow = async (showId: string) => {
    if (
      confirm(
        "Are you sure you want to cancel this show? This will delete the show, cancel all bookings and invalidate their payments."
      )
    ) {
      const res = await cancelShowAction(showId);
      if ("error" in res) {
        alert(res.error);
      } else {
        alert("Show cancelled successfully!");
        refreshTheatres();
      }
    }
  };

  const activeScreens = theatres.flatMap((t) =>
    t.screens.map((s: any) => ({ ...s, theatreName: t.name, city: t.city.name }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-zinc-950 dark:text-white">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Admin & Operations Portal</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Logged in as <span className="text-rose-600 font-bold">{role}</span>. Manage movies, theatres, screen grids, and shows.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-250/10 dark:border-zinc-800 gap-1 select-none">
        {role === Role.ADMIN && (
          <button
            onClick={() => setActiveTab("approvals")}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "approvals" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Theatre Approvals</span>
          </button>
        )}
        
        <button
          onClick={() => setActiveTab("theatres")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "theatres" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{role === Role.ADMIN ? "All Theatres" : "My Theatres"}</span>
        </button>

        <button
          onClick={() => setActiveTab("shows")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "shows" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule Show</span>
        </button>

        {role === Role.ADMIN && (
          <button
            onClick={() => setActiveTab("movies")}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "movies" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Add Movie</span>
          </button>
        )}
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* ========================================================================= */}
        {/* THEATRE APPROVALS TAB (Admin Only) */}
        {/* ========================================================================= */}
        {activeTab === "approvals" && role === Role.ADMIN && (
          <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black">Pending Theatre Approvals</h2>
              <p className="text-xs text-zinc-500">Approve or reject newly registered theatres.</p>
            </div>

            {pendingTheatres.length === 0 ? (
              <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold">All caught up!</p>
                <p className="text-xs text-zinc-500 mt-0.5">No pending theatre approvals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingTheatres.map((theatre) => (
                  <div
                    key={theatre.id}
                    className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-bold text-lg leading-tight">{theatre.name}</h3>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase">
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{theatre.address}, {theatre.city.name}</p>
                      
                      <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-zinc-400" />{theatre.owner.name}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-zinc-400" />{theatre.owner.email}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/50">
                      <button
                        onClick={() => handleApproveTheatre(theatre.id, true)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleApproveTheatre(theatre.id, false)}
                        className="py-2 px-4 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEATRES TAB (List + Screens + Designer) */}
        {/* ========================================================================= */}
        {activeTab === "theatres" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Create / List Theatres */}
            <div className="lg:col-span-1 space-y-6">
              {/* Create Theatre form */}
              <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-4">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-600" />
                  <span>Register Theatre</span>
                </h2>

                <form onSubmit={handleTheatreSubmit} className="space-y-4">
                  {theatreStatus.error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-450 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{theatreStatus.error}</div>}
                  {theatreStatus.success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-550 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{theatreStatus.success}</div>}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Theatre Name</label>
                    <input name="name" type="text" required placeholder="PVR Inorbit Mall" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">City</label>
                      <input name="city" type="text" required placeholder="Mumbai" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">Address</label>
                      <input name="address" type="text" required placeholder="Malad West" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">Latitude</label>
                      <input name="latitude" type="number" step="0.000001" placeholder="19.12345" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">Longitude</label>
                      <input name="longitude" type="number" step="0.000001" placeholder="72.87654" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">Contact Phone</label>
                      <input name="contactPhone" type="tel" placeholder="+91 999999999" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500">Contact Email</label>
                      <input name="contactEmail" type="email" placeholder="contact@pvr.com" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/25 cursor-pointer">
                    Register Theatre
                  </button>
                </form>
              </div>

              {/* Theatre List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">My Registered Theatres</h3>
                {theatres.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No theatres registered yet.</p>
                ) : (
                  theatres.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTheatre(t);
                        setSelectedScreen(null);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        selectedTheatre?.id === t.id
                          ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-450"
                          : "bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-sm">{t.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${
                          t.approved 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        }`}>
                          {t.approved ? "Approved" : "Pending"}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{t.address}, {t.city.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right/Middle: Detail View (Screens & Layout) */}
            <div className="lg:col-span-2 space-y-6">
              {selectedTheatre ? (
                <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-8">
                  
                  {/* Theatre Details */}
                  <div className="flex justify-between items-start gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-5">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black">{selectedTheatre.name}</h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                        {selectedTheatre.address}, {selectedTheatre.city.name}
                      </p>
                    </div>

                    <div className="flex gap-2 text-xs">
                      {selectedTheatre.contactPhone && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                          <Phone className="w-3.5 h-3.5" /> {selectedTheatre.contactPhone}
                        </span>
                      )}
                      {selectedTheatre.contactEmail && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                          <Mail className="w-3.5 h-3.5" /> {selectedTheatre.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Screens Management */}
                  <div className="space-y-6">
                    <h3 className="font-bold text-lg">Manage Screens</h3>

                    {/* Add Screen Form */}
                    <form onSubmit={handleAddScreen} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-zinc-50 dark:bg-zinc-900/35 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Screen Name</label>
                        <input name="screenName" type="text" required placeholder="Audi 1" className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Rows</label>
                        <input name="rows" type="number" required min="3" max="15" defaultValue="8" className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Cols</label>
                        <input name="cols" type="number" required min="3" max="20" defaultValue="10" className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-xs px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                      </div>
                      <button type="submit" className="sm:col-span-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer">
                        Add Screen
                      </button>
                    </form>

                    {/* Screens list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTheatre.screens.map((screen: any) => (
                        <div
                          key={screen.id}
                          className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex justify-between items-center group shadow-xs"
                        >
                          <div className="space-y-1">
                            <p className="font-bold text-zinc-900 dark:text-white">{screen.name}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase">
                              {screen.rowsCount} Rows x {screen.colsCount} Cols
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openDesigner(screen)}
                              className="p-2 bg-rose-600/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                            >
                              <Grid className="w-4 h-4" />
                              <span>Layout Designer</span>
                            </button>
                            <button
                              onClick={() => handleDeleteScreen(screen.id)}
                              className="p-2 bg-red-600/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-xl transition-all cursor-pointer"
                              aria-label="Delete screen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-24 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-850 p-6 flex flex-col items-center justify-center space-y-3">
                  <MapPin className="w-10 h-10 text-rose-600/30" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Select a theatre from the sidebar to manage screens, layouts, and shows.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCHEDULE SHOW TAB */}
        {/* ========================================================================= */}
        {activeTab === "shows" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Scheduler Form */}
            <div className="lg:col-span-1 bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-4">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" />
                <span>Schedule Show</span>
              </h2>

              <form onSubmit={handleShowSubmit} className="space-y-4">
                {showStatus.error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-450 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{showStatus.error}</div>}
                {showStatus.success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-550 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{showStatus.success}</div>}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500">Select Movie</label>
                  <select name="movieId" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none">
                    <option value="">Choose a movie...</option>
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.durationMins} mins)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500">Select Screen</label>
                  <select name="screenId" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none">
                    <option value="">Choose a theatre screen...</option>
                    {theatres.filter((t) => t.approved).map((t: any) =>
                      t.screens.map((s: any) => (
                        <option key={s.id} value={s.id}>{t.name} - {s.name} ({t.city.name})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Format</label>
                    <select name="format" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none">
                      <option value="TWO_D">2D</option>
                      <option value="THREE_D">3D</option>
                      <option value="IMAX">IMAX</option>
                      <option value="FOUR_DX">4DX</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Language</label>
                    <select name="languageId" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none">
                      {languages.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Start Time</label>
                    <input name="startTime" type="datetime-local" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500">Base Price (USD)</label>
                    <input name="basePrice" type="number" step="0.01" required placeholder="10.00" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
                  </div>
                </div>

                <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/25 cursor-pointer">
                  Schedule Show
                </button>
              </form>
            </div>

            {/* Right: Shows list and stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-6">
                <h3 className="font-bold text-lg">Active Scheduled Shows</h3>

                {theatres.flatMap(t => t.screens.flatMap((s: any) => s.shows)).length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No active shows scheduled yet.</p>
                ) : (
                  <div className="space-y-4">
                    {theatres.map((theatre) =>
                      theatre.screens.map((screen: any) =>
                        screen.shows.map((show: any) => {
                          const showStat = showStats[show.id];
                          return (
                            <div
                              key={show.id}
                              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col md:flex-row justify-between md:items-center gap-4"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-zinc-900 dark:text-white">{show.movie.title}</p>
                                  <span className="px-2 py-0.5 rounded-md bg-rose-600/10 text-rose-600 border border-rose-500/20 text-[9px] font-extrabold uppercase tracking-wider">
                                    {show.format}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                                  {theatre.name} - {screen.name} • {new Date(show.startTime).toLocaleString()}
                                </p>

                                {showStat && (
                                  <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <span className="text-rose-600">★ Sold: {showStat.bookedSeats} / {showStat.totalSeats}</span>
                                    <span>•</span>
                                    <span className="text-emerald-500">Revenue: ${showStat.totalRevenue.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                {!showStat && (
                                  <button
                                    onClick={() => fetchShowStats(show.id)}
                                    className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                                  >
                                    Show Stats
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCancelShow(show.id)}
                                  className="p-2 bg-red-650/10 text-red-650 dark:text-red-400 hover:bg-red-600 hover:text-white border border-red-555/20 rounded-xl cursor-pointer"
                                  aria-label="Cancel show"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD MOVIE TAB (Admin Only) */}
        {/* ========================================================================= */}
        {activeTab === "movies" && role === Role.ADMIN && (
          <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-850 shadow-xs space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-600" />
              <span>Add Movie Metadata</span>
            </h2>

            <form onSubmit={handleMovieSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movieStatus.error && <div className="col-span-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{movieStatus.error}</div>}
              {movieStatus.success && <div className="col-span-full p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex gap-2"><CheckCircle2 className="w-4 h-4" />{movieStatus.success}</div>}

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-bold text-zinc-500">Movie Title</label>
                <input name="title" type="text" required placeholder="Dune: Part Two" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
              </div>

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-bold text-zinc-500">Synopsis</label>
                <textarea name="description" required rows={3} placeholder="Provide a brief summary..." className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Poster URL</label>
                <input name="posterUrl" type="url" required placeholder="https://images.unsplash.com/..." className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Banner URL</label>
                <input name="bannerUrl" type="url" required placeholder="https://images.unsplash.com/..." className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Genre</label>
                <input name="genre" type="text" required placeholder="Action, Sci-Fi, Adventure" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Language</label>
                <input name="language" type="text" required placeholder="English, French" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Duration (Minutes)</label>
                <input name="durationMins" type="number" required placeholder="166" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500">Rating (Out of 10)</label>
                <input name="rating" type="number" step="0.1" required placeholder="8.9" className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 focus:outline-none" />
              </div>

              <div className="space-y-1.5 col-span-full">
                <label className="text-xs font-bold text-zinc-500">Release Date</label>
                <input name="releaseDate" type="date" required className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 focus:outline-none" />
              </div>

              <button type="submit" className="col-span-full mt-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/25 cursor-pointer">
                Create Movie Record
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* SEAT LAYOUT DESIGNER MODAL */}
      {/* ========================================================================= */}
      {selectedScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in scale-in duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/20">
              <div>
                <h3 className="text-xl font-black">
                  Seat Layout Designer: <span className="text-rose-600">{selectedScreen.name}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1">
                  Design custom seating grids, toggle walkways, and paint seat categories.
                </p>
              </div>
              <button
                onClick={() => setSelectedScreen(null)}
                className="p-2 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              
              {/* Designer Controls */}
              <div className="space-y-6 lg:col-span-1 bg-zinc-50 dark:bg-zinc-900/35 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-rose-600" />
                    Designer Settings
                  </h4>

                  {/* Dimension inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Rows</label>
                      <input
                        type="number"
                        min="3"
                        max="15"
                        value={designerRows}
                        onChange={(e) => setDesignerRows(parseInt(e.target.value) || 8)}
                        className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs px-3 py-2 rounded-xl border border-zinc-250 dark:border-zinc-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Cols</label>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={designerCols}
                        onChange={(e) => setDesignerCols(parseInt(e.target.value) || 10)}
                        className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs px-3 py-2 rounded-xl border border-zinc-250 dark:border-zinc-800"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => generateDefaultGrid(designerRows, designerCols)}
                    className="w-full py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-zinc-350 dark:border-zinc-750 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-generate Grid
                  </button>
                </div>

                <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Editing Mode</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setDesignerMode("toggle-active")}
                      className={`py-2 rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        designerMode === "toggle-active"
                          ? "bg-rose-600 border-rose-650 text-white"
                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      Walkways
                    </button>
                    <button
                      onClick={() => setDesignerMode("paint-type")}
                      className={`py-2 rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        designerMode === "paint-type"
                          ? "bg-rose-600 border-rose-650 text-white"
                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      Paint Types
                    </button>
                  </div>
                </div>

                {designerMode === "paint-type" && (
                  <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Category</h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      {(["NORMAL", "PREMIUM", "VIP", "RECLINER", "COUPLE", "WHEELCHAIR"] as SeatType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedSeatType(type)}
                          className={`py-2 rounded-xl border transition-all cursor-pointer truncate px-1.5 ${
                            selectedSeatType === type
                              ? "bg-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Grid Canvas */}
              <div className="lg:col-span-3 space-y-6 flex flex-col items-center">
                
                {/* Screen Indicator */}
                <div className="w-full flex flex-col items-center select-none pb-4">
                  <div className="w-3/4 h-2 bg-gradient-to-r from-rose-500/10 via-rose-500/80 to-rose-500/10 rounded-full shadow-[0_0_15px_0_rgba(225,29,72,0.3)]" />
                  <span className="text-[9px] text-rose-400 font-bold tracking-[0.3em] uppercase mt-1.5">SCREEN</span>
                </div>

                {/* Canvas Grid */}
                <div className="overflow-auto max-w-full p-4 border border-zinc-200 dark:border-zinc-850 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10 flex justify-center w-full">
                  <div className="flex flex-col gap-2 min-w-max">
                    {designerGrid.map((rowArray, rIdx) => {
                      const rowName = String.fromCharCode(65 + rIdx);
                      return (
                        <div key={rowName} className="flex items-center gap-3">
                          
                          {/* Row letter */}
                          <span className="w-6 text-zinc-400 dark:text-zinc-500 font-bold text-xs text-center select-none">
                            {rowName}
                          </span>

                          {/* Row cells */}
                          <div className="flex gap-2">
                            {rowArray.map((cell, cIdx) => {
                              const isActive = cell.active;
                              const seatType = cell.type as SeatType;

                              let bgClass = "bg-zinc-200 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700";
                              if (!isActive) {
                                bgClass = "bg-transparent text-transparent border-dashed border-zinc-300 dark:border-zinc-800 border hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20";
                              } else {
                                if (seatType === "PREMIUM") bgClass = "bg-indigo-600/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 border";
                                if (seatType === "VIP") bgClass = "bg-amber-600/15 border-amber-500/30 text-amber-600 dark:text-amber-450 border";
                                if (seatType === "RECLINER") bgClass = "bg-emerald-600/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-450 border";
                                if (seatType === "COUPLE") bgClass = "bg-pink-600/15 border-pink-500/30 text-pink-600 dark:text-pink-400 border w-18"; // Double wide
                                if (seatType === "WHEELCHAIR") bgClass = "bg-sky-600/15 border-sky-500/30 text-sky-600 dark:text-sky-400 border";
                              }

                              return (
                                <button
                                  key={cIdx}
                                  onClick={() => handleCellClick(rIdx, cIdx)}
                                  className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${bgClass}`}
                                  title={`Row ${rowName} Col ${cIdx + 1} (${isActive ? seatType : "Walkway"})`}
                                >
                                  {isActive ? cell.number : ""}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Row Paint */}
                          {designerMode === "paint-type" && (
                            <button
                              onClick={() => handleApplyRowType(rIdx, selectedSeatType)}
                              className="px-2 py-1 text-[9px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Paint entire row"
                            >
                              Row
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700" />
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-555/10 border border-indigo-500/30" />
                    <span>Premium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-555/10 border border-amber-500/30" />
                    <span>VIP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-555/10 border border-emerald-500/30" />
                    <span>Recliner</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-pink-555/10 border border-pink-500/30" />
                    <span>Couple</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-555/10 border border-sky-500/30" />
                    <span>Wheelchair</span>
                  </div>
                </div>

                {/* Status messages */}
                {designerStatus.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-450 rounded-xl text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{designerStatus.error}</div>
                )}
                {designerStatus.success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-550 rounded-xl text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{designerStatus.success}</div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/20">
              <button
                onClick={() => setSelectedScreen(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-150 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSaveLayout}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Save Layout & Regenerate Seats
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
