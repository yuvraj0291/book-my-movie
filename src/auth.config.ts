import type { NextAuthConfig } from "next-auth";
import { Role } from "@/types";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/admin");
      const isOnBooking = nextUrl.pathname.startsWith("/booking");
      const isOnSettings = nextUrl.pathname.startsWith("/settings");
      
      if (isOnDashboard) {
        if (isLoggedIn && auth.user.role === Role.ADMIN) return true;
        return Response.redirect(new URL("/", nextUrl)); // Redirect non-admins to home page
      } else if (isOnBooking || isOnSettings) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      return true;
    },
  },
  providers: [], // Add in auth.ts
} satisfies NextAuthConfig;
