import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import crypto from "crypto";

export const { auth, signIn, signOut, handlers } = NextAuth({
  adapter: PrismaAdapter(db),
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || "mock",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "mock",
    }),
    Credentials({
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        // Check if it is a 2FA bypass token
        if (password.startsWith("BYPASS_SPECIAL_TOKEN:")) {
          const token = password.split(":")[1];
          try {
            const cachedUserId = await redis.get<string>(`login_token:${token}`);
            if (cachedUserId) {
              await redis.del(`login_token:${token}`);
              const user = await db.user.findUnique({
                where: { id: cachedUserId },
              });
              if (user) {
                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                };
              }
            }
          } catch (e) {
            console.error("2FA login bypass token verification failed:", e);
          }
          return null;
        }

        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email: parsedEmail, password: parsedPassword } = parsedCredentials.data;
        const user = await db.user.findUnique({
          where: { email: parsedEmail },
        });

        if (!user || !user.password) return null;

        // Check if account is locked out
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const passwordsMatch = await bcrypt.compare(parsedPassword, user.password);

        if (passwordsMatch) {
          // Reset failed attempts on success
          if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockoutUntil: null,
              },
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        // Increment failed attempts on failure
        const attempts = user.failedLoginAttempts + 1;
        const updates: Record<string, any> = { failedLoginAttempts: attempts };
        
        if (attempts >= 5) {
          updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
        }

        await db.user.update({
          where: { id: user.id },
          data: updates,
        });

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as Role;
        token.id = user.id as string;

        // Generate a cryptographically secure session identifier (jti)
        const jti = crypto.randomBytes(32).toString("hex");
        token.jti = jti;

        // Write session to database and cache in Redis
        try {
          const reqHeaders = await headers();
          const userAgent = reqHeaders.get("user-agent") || "unknown";
          const ipAddress = reqHeaders.get("x-forwarded-for") || "127.0.0.1";
          
          // Max age is 30 days
          const maxAgeSeconds = 30 * 24 * 60 * 60;
          const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

          await db.userSession.create({
            data: {
              userId: user.id as string,
              jti,
              userAgent,
              ipAddress,
              expiresAt,
            },
          });

          await redis.set(`session:valid:${jti}`, "1", { ex: maxAgeSeconds });
        } catch (e) {
          console.error("Failed to persist user session token:", e);
        }
      }

      // Validate the token's jti on subsequent requests
      if (token.jti) {
        const jti = token.jti as string;
        let isValid = false;

        // 1. Check Redis cache first (sub-millisecond lookups)
        try {
          const cached = await redis.get<string>(`session:valid:${jti}`);
          if (cached === "1") {
            isValid = true;
          }
        } catch (e) {
          console.error("Redis session check failed, falling back to database:", e);
        }

        // 2. Fallback to database on cache miss
        if (!isValid) {
          try {
            const dbSession = await db.userSession.findUnique({
              where: { jti },
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
              isValid = true;
              // Re-cache in Redis
              const ttlSeconds = Math.max(
                0,
                Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000)
              );
              await redis.set(`session:valid:${jti}`, "1", { ex: ttlSeconds });
            }
          } catch (dbError) {
            console.error("Database session verification failed:", dbError);
          }
        }

        if (!isValid) {
          // Returning null invalidates the cookie session
          return null as any;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.jti = token.jti;
      }
      return session;
    },
  },
});
