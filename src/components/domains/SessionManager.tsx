"use client";

import React, { useState } from "react";
import { revokeSessionAction, revokeAllSessionsAction } from "@/app/actions/authActions";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, ShieldAlert, LogOut, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Session {
  id: string;
  jti: string;
  isCurrent: boolean;
  device: string;
  ipAddress: string | null;
  createdAt: Date;
}

interface SessionManagerProps {
  initialSessions: Session[];
}

export function SessionManager({ initialSessions }: SessionManagerProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string }>({});
  const router = useRouter();

  const handleRevoke = async (id: string) => {
    setLoadingId(id);
    setStatus({});

    try {
      const res = await revokeSessionAction(id);
      if (res.error) {
        setStatus({ error: res.error });
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setStatus({ success: "Device session revoked successfully." });
      }
    } catch (err) {
      setStatus({ error: "Failed to revoke session." });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Are you sure you want to log out of all devices? This will immediately terminate all active sessions including this one.")) return;
    setLoadingAll(true);
    setStatus({});

    try {
      const res = await revokeAllSessionsAction();
      if (res.error) {
        setStatus({ error: res.error });
      } else {
        setStatus({ success: "All active sessions revoked. Redirecting to login..." });
        setTimeout(() => {
          router.push("/login");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setStatus({ error: "Failed to revoke sessions." });
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {status.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{status.error}</span>
        </div>
      )}
      {status.success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{status.success}</span>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white/3 rounded-xl border border-white/5 text-zinc-500 text-sm font-light">
            No active sessions found.
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sessions.map((s) => {
              const isMobile = s.device.toLowerCase().includes("android") || s.device.toLowerCase().includes("ios");
              
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 rounded-xl glass border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                      {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{s.device}</span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        IP: {s.ipAddress || "Unknown"} • Logged in on {new Date(s.createdAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={loadingId === s.id}
                    className={`px-3 py-1.5 border border-white/5 hover:border-red-500/20 bg-white/3 hover:bg-red-500/5 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                      s.isCurrent ? "pointer-events-none opacity-40 border-transparent bg-transparent text-zinc-600" : ""
                    }`}
                    title={s.isCurrent ? "Cannot revoke current session" : "Terminate session"}
                  >
                    {loadingId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5" />
                    )}
                    <span>Revoke Access</span>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {sessions.length > 1 && (
        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleRevokeAll}
            disabled={loadingAll}
            className="px-4 py-2.5 bg-red-650/10 hover:bg-red-650/20 border border-red-500/20 hover:border-red-500/30 text-red-400 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>Log Out of All Devices</span>
          </button>
        </div>
      )}
    </div>
  );
}
