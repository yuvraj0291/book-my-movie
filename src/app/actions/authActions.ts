"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { RedisRateLimiter } from "@/infrastructure/services/RateLimiter";
import { headers } from "next/headers";

const rateLimiter = new RedisRateLimiter();

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUpAction(formData: FormData) {
  const clientIp = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const rateLimitKey = `rate_limit:signup:${clientIp}`;
  const isLimited = await rateLimiter.isRateLimited(rateLimitKey, 5, 600); // 5 signups per 10 mins
  if (isLimited) {
    return { error: "Too many sign up attempts. Please try again later." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validated = signUpSchema.safeParse({ name, email, password });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "Email already registered" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("SignUp error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function loginAction(formData: FormData) {
  const clientIp = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const rateLimitKey = `rate_limit:login:${clientIp}`;
  const isLimited = await rateLimiter.isRateLimited(rateLimitKey, 10, 300); // 10 logins per 5 mins
  if (isLimited) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    // Attempt sign in
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    
    return { success: true };
  } catch (error: any) {
    // Auth.js uses redirecting behaviors that can throw redirect errors, 
    // which Next.js intercepts. Let's return error if they fail credentials match.
    console.error("SignIn error:", error);
    if (error.message && error.message.includes("CredentialsSignin")) {
      return { error: "Invalid email or password" };
    }
    // Return standard error
    return { error: "Invalid email or password" };
  }
}
