"use client";

import React, { useState } from "react";
import { verify2FALoginAction } from "@/app/actions/authActions";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export function TwoFactorLoginForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter a valid code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verify2FALoginAction(code);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
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
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Two-Factor Authentication</h2>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Enter the verification code from your authenticator app, or a 10-character backup recovery code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Security Code</label>
            <input
              type="text"
              required
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-4 py-3 text-center text-lg font-bold text-white tracking-[0.2em] focus:outline-none focus:border-primary/50 placeholder-zinc-650"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded-lg shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
