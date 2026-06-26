"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, signUpAction } from "@/app/actions/authActions";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, UserPlus, LogIn, Mail, Lock, User } from "lucide-react";

export function AuthForm({ mode: initialMode = "login" }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      if (mode === "login") {
        const res = await loginAction(formData);
        if (res?.error) {
          setError(res.error);
        } else if (res?.success) {
          router.push("/");
          router.refresh();
        }
      } else {
        const res = await signUpAction(formData);
        if (res?.error) {
          setError(res.error);
        } else if (res?.success) {
          const loginData = new FormData();
          loginData.append("email", formData.get("email") as string);
          loginData.append("password", formData.get("password") as string);
          const loginRes = await loginAction(loginData);
          if (loginRes?.error) {
            setError("Account created, but sign-in failed. Please sign in manually.");
            setMode("login");
          } else {
            router.push("/");
            router.refresh();
          }
        }
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl glass shadow-2xl relative overflow-hidden border border-white/5">
      
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex border-b border-white/5 mb-8">
        <button
          onClick={() => { setMode("login"); setError(null); }}
          className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${
            mode === "login"
              ? "border-primary text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("register"); setError(null); }}
          className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${
            mode === "register"
              ? "border-primary text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {mode === "login" ? "Welcome back" : "Get started"}
          </h2>
          <p className="text-sm text-zinc-400 mb-6 font-light">
            {mode === "login"
              ? "Sign in to book seats, access ticket confirmations, and review movie history."
              : "Register a profile to start locking and booking theatre seats dynamically."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Name</label>
                <div className="relative">
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full bg-white/5 text-sm px-4 py-2.5 pl-10 rounded-lg border border-white/5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder-zinc-500"
                  />
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Email Address</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  className="w-full bg-white/5 text-sm px-4 py-2.5 pl-10 rounded-lg border border-white/5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder-zinc-500"
                />
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 text-sm px-4 py-2.5 pl-10 rounded-lg border border-white/5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-white placeholder-zinc-500"
                />
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold text-sm rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:pointer-events-none hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
