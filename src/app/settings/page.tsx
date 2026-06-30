import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { SettingsForm } from "@/components/domains/SettingsForm";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#030712] py-12 px-4 transition-colors duration-200">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 dark:border-white/5 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Account Settings</h1>
              <p className="text-zinc-550 dark:text-zinc-400 text-sm font-light mt-1">Manage your profile information and active devices.</p>
            </div>
            
            <div className="flex gap-3">
              <Link 
                href="/settings/devices" 
                className="px-4 py-2 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-600 hover:text-zinc-850 dark:text-zinc-300 dark:hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Active Device Sessions</span>
              </Link>
            </div>
          </div>
          
          <SettingsForm initialUser={{
            name: user.name || "",
            email: user.email,
            image: user.image || "",
            twoFactorEnabled: user.twoFactorEnabled,
          }} />
        </div>
      </main>
      <Footer />
    </>
  );
}
