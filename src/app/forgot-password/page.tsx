import React from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { ForgotPasswordForm } from "@/components/domains/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className="flex-1 w-full flex items-center justify-center bg-[#030712] py-20 px-4">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
