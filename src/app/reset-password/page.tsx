import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { ResetPasswordForm } from "@/components/domains/ResetPasswordForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <Header />
      <main className="flex-1 w-full flex items-center justify-center bg-zinc-50 dark:bg-[#030712] py-20 px-4 transition-colors duration-200">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="max-w-md w-full text-center space-y-4 glass p-8 rounded-2xl border border-zinc-200 dark:border-white/5">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Invalid Reset Link</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light">
              This password reset link is missing a valid security token.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg"
            >
              Request a New Link
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
