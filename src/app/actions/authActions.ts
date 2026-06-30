"use server";

import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, auth } from "@/auth";
import { RedisRateLimiter } from "@/infrastructure/services/RateLimiter";
import { ResendEmailService } from "@/infrastructure/services/ResendEmailService";
import { signToken, verifyToken } from "@/utils/crypto";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});
import qrcode from "qrcode";
import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

const rateLimiter = new RedisRateLimiter();
const emailService = new ResendEmailService();

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown Device";
  const uaLower = ua.toLowerCase();
  
  let browser = "Unknown Browser";
  if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("chrome") && !uaLower.includes("chromium")) browser = "Chrome";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("edge") || uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("opera") || uaLower.includes("opr/")) browser = "Opera";
  
  let os = "Unknown OS";
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("macintosh") || uaLower.includes("mac os")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  
  return `${browser} on ${os}`;
}

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
    
    // Create inactive user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Create email verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    await db.verificationToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
    
    const emailSent = await emailService.send({
      to: email,
      subject: "Verify Your Email - MovieRocks 🍿",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #e11d48; text-align: center;">Welcome to MovieRocks!</h2>
          <p>Hi ${name || "there"},</p>
          <p>Thank you for signing up. Please verify your email address to activate your account and start booking tickets.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="font-size: 12px; color: #888;">If you did not create this account, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (!emailSent) {
      // Rollback user and token creation to allow immediate retry
      await db.verificationToken.deleteMany({ where: { email } });
      await db.user.delete({ where: { id: user.id } });
      
      return { 
        error: "Failed to send verification email. If you are using a Resend sandbox API key, please register using the exact email address associated with your Resend account, or verify a custom domain and configure RESEND_FROM_EMAIL." 
      };
    }

    // Write audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "SIGN_UP",
        details: "User registered, verification email sent",
        ipAddress: clientIp,
      },
    });

    return { success: true, message: "Registration successful! Please check your email to verify your account." };
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
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return { error: "Invalid email or password" };
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return { error: "Account temporarily locked due to repeated failures. Try again in 15 minutes." };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const data: Record<string, any> = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        data.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
      }
      await db.user.update({ where: { id: user.id }, data });
      return { error: "Invalid email or password" };
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return { error: "Please verify your email address before logging in." };
    }

    // Reset failed login attempts on success
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Set encrypted 2FA temporary cookie (expires in 5 minutes)
      const token = signToken({ userId: user.id, email: user.email }, 5 * 60 * 1000);
      const cookieStore = await cookies();
      cookieStore.set("temp_2fa", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300,
      });

      return { twoFactorRequired: true };
    }

    // Complete sign-in
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    
    // Write audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        details: "User logged in successfully (2FA off)",
        ipAddress: clientIp,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("SignIn error:", error);
    if (error.message && error.message.includes("CredentialsSignin")) {
      return { error: "Invalid email or password" };
    }
    return { error: "Invalid email or password" };
  }
}

export async function requestPasswordResetAction(email: string) {
  const clientIp = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  
  if (!email) {
    return { error: "Email address is required" };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Fail silently to prevent account enumeration attacks
      return { success: true, message: "If your email is registered, you will receive a reset link shortly." };
    }

    // Create password reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry

    await db.passwordResetToken.upsert({
      where: { email_token: { email, token } },
      update: { token, expiresAt },
      create: { email, token, expiresAt },
    });

    // Send reset email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await emailService.send({
      to: email,
      subject: "Reset Your Password - MovieRocks 🍿",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #e11d48; text-align: center;">Reset Your Password</h2>
          <p>Hi ${user.name || "there"},</p>
          <p>We received a request to reset your password. Click the link below to set a new one. This link will expire in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #888;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_REQUEST",
        details: "Password reset token generated and sent",
        ipAddress: clientIp,
      },
    });

    return { success: true, message: "If your email is registered, you will receive a reset link shortly." };
  } catch (e) {
    console.error("Password reset request error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function resetPasswordAction(token: string, newPassword: string) {
  const clientIp = (await headers()).get("x-forwarded-for") || "127.0.0.1";

  if (!token || !newPassword || newPassword.length < 6) {
    return { error: "Invalid password or token details." };
  }

  try {
    const tokenRecord = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return { error: "Password reset token is invalid or has expired." };
    }

    const user = await db.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      return { error: "User not found." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.$transaction(async (tx) => {
      // 1. Update password
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // 2. Delete reset token
      await tx.passwordResetToken.delete({
        where: { token },
      });
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_COMPLETE",
        details: "Password successfully updated via reset token",
        ipAddress: clientIp,
      },
    });

    return { success: true, message: "Password updated successfully. You can now log in." };
  } catch (e) {
    console.error("Reset password error:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// 2FA Actions
export async function generate2FASecretAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const secret = totp.generateSecret();
    const otpauthUrl = totp.toURI({ label: session.user.email!, issuer: "MovieRocks", secret });
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

    return { secret, qrCodeUrl };
  } catch (e) {
    console.error("Failed to generate 2FA secret:", e);
    return { error: "Failed to generate 2FA secret" };
  }
}

export async function enable2FAAction(secret: string, code: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  const userId = session.user.id;

  try {
    const isValid = (await totp.verify(code, { secret })).valid;
    if (!isValid) {
      return { error: "Invalid verification code. Please check your authenticator app." };
    }

    // Generate cryptographically secure backup codes
    const backupCodesPlain: string[] = [];
    const backupCodesHashed: string[] = [];

    for (let i = 0; i < 8; i++) {
      const plainCode = crypto.randomBytes(5).toString("hex"); // 10 chars
      backupCodesPlain.push(plainCode);
      const hashedCode = await bcrypt.hash(plainCode, 10);
      backupCodesHashed.push(hashedCode);
    }

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodesHashed),
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "2FA_ENABLE",
        details: "Two-factor authentication enabled",
      },
    });

    return { success: true, backupCodes: backupCodesPlain };
  } catch (e) {
    console.error("Enable 2FA failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function disable2FAAction(code: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  const userId = session.user.id;

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return { error: "2FA is not enabled" };
    }

    const isValid = (await totp.verify(code, { secret: user.twoFactorSecret })).valid;
    if (!isValid) {
      return { error: "Invalid verification code." };
    }

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "2FA_DISABLE",
        details: "Two-factor authentication disabled",
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Disable 2FA failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function verify2FALoginAction(code: string) {
  const clientIp = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  
  const cookieStore = await cookies();
  const tempCookie = cookieStore.get("temp_2fa");

  if (!tempCookie || !tempCookie.value) {
    return { error: "Login session expired. Please return to the login page." };
  }

  const payload = verifyToken(tempCookie.value);
  if (!payload || !payload.userId) {
    return { error: "Login session expired. Please return to the login page." };
  }

  const userId = payload.userId as string;

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return { error: "Account details not found" };
    }

    let isValid = (await totp.verify(code, { secret: user.twoFactorSecret })).valid;
    let usedBackupCode = false;

    // Check backup codes if TOTP fails
    if (!isValid && user.twoFactorBackupCodes) {
      const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
      
      for (let i = 0; i < backupCodes.length; i++) {
        const matches = await bcrypt.compare(code, backupCodes[i]);
        if (matches) {
          isValid = true;
          usedBackupCode = true;
          // Remove used backup code
          backupCodes.splice(i, 1);
          await db.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
          });
          break;
        }
      }
    }

    if (!isValid) {
      return { error: "Invalid code. Please try again." };
    }

    // Clear temporary cookie
    cookieStore.delete("temp_2fa");

    // Perform NextAuth sign-in (we sign in via Credentials by logging in directly)
    // Note: since they've already verified credentials in loginAction and verified 2FA here,
    // we sign them in with NextAuth credentials provider.
    // Wait, since we are on the server side, we can invoke signIn credentials. We need password.
    // But since credentials provider authorize method requires email and password, how can we complete signIn?
    // Wait! An easy solution is:
    // When we set `temp_2fa` cookie, we can include the user's password hash or email inside the encrypted payload!
    // Or, during verify2FALoginAction, since the database verifies the user, we can write a special bypass key in Redis:
    // We generate a random single-use login token, save it in Redis `login_token:${token} -> userId`, and call:
    // `signIn("credentials", { email: user.email, password: "BYPASS_SPECIAL_TOKEN:" + token })`!
    // Inside the `authorize` method in `auth.ts`, if `password` starts with `"BYPASS_SPECIAL_TOKEN:"`, we extract the token, verify it in Redis. If it matches the user's ID, we log them in!
    // This is incredibly secure, single-use, has a 10-second TTL, and bypasses credentials verification cleanly without exposing passwords!
    // Let's implement this! It is absolutely perfect!

    const bypassToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`login_token:${bypassToken}`, userId, { ex: 10 }); // 10 seconds TTL

    await signIn("credentials", {
      email: user.email,
      password: `BYPASS_SPECIAL_TOKEN:${bypassToken}`,
      redirect: false,
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "LOGIN_2FA",
        details: `User logged in via 2FA (${usedBackupCode ? "recovery code" : "authenticator TOTP"})`,
        ipAddress: clientIp,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("2FA Verification failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

// Device & Session management actions
export async function getUserSessionsAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return [];
  }

  try {
    const userSessions = await db.userSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return userSessions.map((s) => ({
      id: s.id,
      jti: s.jti,
      isCurrent: s.jti === session.user.jti,
      device: parseUserAgent(s.userAgent || ""),
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
    }));
  } catch (e) {
    console.error("Failed to query active user sessions:", e);
    return [];
  }
}

export async function revokeSessionAction(sessionId: string) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  try {
    const sessionRecord = await db.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!sessionRecord || sessionRecord.userId !== session.user.id) {
      return { error: "Session not found" };
    }

    // Delete from DB
    await db.userSession.delete({ where: { id: sessionId } });
    // Delete from Redis
    await redis.del(`session:valid:${sessionRecord.jti}`);

    revalidatePath("/settings/devices");
    return { success: true };
  } catch (e) {
    console.error("Failed to revoke session:", e);
    return { error: "Failed to revoke session" };
  }
}

export async function revokeAllSessionsAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  const userId = session.user.id;

  try {
    const userSessions = await db.userSession.findMany({
      where: { userId },
    });

    // Delete keys from Redis
    for (const s of userSessions) {
      await redis.del(`session:valid:${s.jti}`);
    }

    // Delete all records except the current one (or delete all including current)
    // Deleting all means the user is logged out of the current device too! That's fine,
    // but usually, it's nicer to delete all OTHER sessions or delete all. The prompt says:
    // "Secure logout from all devices"
    // Let's delete all sessions!
    await db.userSession.deleteMany({
      where: { userId },
    });

    revalidatePath("/settings/devices");
    return { success: true };
  } catch (e) {
    console.error("Failed to revoke all sessions:", e);
    return { error: "Failed to revoke sessions" };
  }
}

export async function updateProfileAction(data: { name?: string; image?: string; password?: string }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { error: "Authentication required" };
  }

  const userId = session.user.id;

  try {
    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.image) updates.image = data.image;
    if (data.password) {
      updates.password = await bcrypt.hash(data.password, 10);
    }

    await db.user.update({
      where: { id: userId },
      data: updates,
    });

    revalidatePath("/settings/profile");
    return { success: true };
  } catch (e) {
    console.error("Failed to update profile:", e);
    return { error: "Failed to update profile" };
  }
}
