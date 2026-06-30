import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { SessionManager } from "@/components/domains/SessionManager";
import { getUserSessionsAction } from "@/app/actions/authActions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const activeSessions = await getUserSessionsAction();

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] py-12 px-4 transition-colors duration-200">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 dark:border-white/5 pb-6 gap-4">
            <div>
              <Link 
                href="/settings" 
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-1 transition-colors mb-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Settings</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-sans">Active Device Sessions</h1>
              <p className="text-zinc-550 dark:text-zinc-400 text-sm font-light mt-1">Review and revoke active login sessions on your account.</p>
            </div>
          </div>
          
          <SessionManager initialSessions={activeSessions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
