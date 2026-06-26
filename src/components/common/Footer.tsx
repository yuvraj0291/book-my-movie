import React from "react";
import Link from "next/link";
import { Film, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#050b18] border-t border-white/5 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
          {/* Logo */}
          <div className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-lg text-white">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Movie<span className="text-primary">Rocks</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Movies</Link>
            <Link href="/bookings" className="hover:text-white transition-colors">My Bookings</Link>
            <Link href="/" className="hover:text-white transition-colors">Theatres</Link>
            <Link href="/" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} MovieRocks. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              <span>GitHub</span>
            </a>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Secure Transactions</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
