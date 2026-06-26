"use client";

import React, { useState } from "react";
import { resetPasswordAction } from "@/app/actions/authActions";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setStatus({ error: "Password must be at least 6 characters long" });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ error: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setStatus({});

    try {
      const res = await resetPasswordAction(token, password);
      if (res.error) {
        setStatus({ error: res.error });
      } else {
        setStatus({ success: res.message });
      }
    } catch (err) {
      setStatus({ error: "Failed to reset password. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md p-8 rounded-2xl glass border border-white/5 relative overflow-hidden"
    >
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

      <div className="space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Create New Password</h2>
          <p className="text-xs text-zinc-400 font-light">
            Enter and confirm your new password below.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status.success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-3"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs text-zinc-350 font-light leading-relaxed">{status.success}</p>
              <Link
                href="/login"
                className="mt-4 inline-block px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Sign In Now
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{status.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">New Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-650"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-zinc-650"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
