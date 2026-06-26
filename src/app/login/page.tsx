import React from "react";
import { AuthForm } from "@/components/domains/AuthForm";
import Link from "next/link";
import { Film } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030712]">
      {/* Cinematic background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.05),transparent_70%)] pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-2.5 rounded-xl text-white shadow-lg shadow-primary/20">
            <Film className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Movie<span className="text-primary">Rocks</span>
          </span>
        </Link>
        
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
