import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/utils/logger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token) {
    logger.warn("Verification request missing token");
    return NextResponse.redirect(`${baseUrl}/login?error=Verification+token+is+missing`);
  }

  try {
    // 1. Find the token
    const tokenRecord = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      logger.warn("Invalid or expired verification token submitted", { token });
      return NextResponse.redirect(`${baseUrl}/login?error=Token+is+invalid+or+expired`);
    }

    // 2. Mark the user as verified
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: tokenRecord.email },
        data: { emailVerified: new Date() },
      });

      // 3. Delete the used token
      await tx.verificationToken.delete({
        where: { token },
      });
    });

    logger.info("User email verified successfully", { email: tokenRecord.email });
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (e) {
    logger.error("Email verification route failed", e);
    return NextResponse.redirect(`${baseUrl}/login?error=Something+went+wrong.+Please+try+again`);
  }
}
