import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { TwoFactorLoginForm } from "@/components/domains/TwoFactorLoginForm";

export const dynamic = "force-dynamic";

export default function TwoFactorLoginPage() {
  return (
    <>
      <Header />
      <main className="flex-1 w-full flex items-center justify-center bg-zinc-50 dark:bg-[#030712] py-20 px-4 transition-colors duration-200">
        <TwoFactorLoginForm />
      </main>
      <Footer />
    </>
  );
}
