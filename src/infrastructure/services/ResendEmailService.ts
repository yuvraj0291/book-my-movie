import { IEmailService, SendEmailPayload } from "@/core/services/IEmailService";
import { resend } from "@/lib/resend";

export class ResendEmailService implements IEmailService {
  async send(payload: SendEmailPayload): Promise<boolean> {
    try {
      const { to, subject, html } = payload;
      
      // Default to onboarding@resend.dev for Resend sandbox testing if custom domain not verified
      const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      const response = await resend.emails.send({
        from: `MovieRocks <${fromAddress}>`,
        to: [to],
        subject,
        html,
      });

      console.log(`Resend API Response: ${JSON.stringify(response)}`);

      if (response.error) {
        console.error("Resend send email error:", response.error);
        
        // If in development mode, log and pretend it succeeded so developers aren't blocked by API limits
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[DEV] Mock success sending email to ${to}: ${subject}`);
          return true;
        }
        return false;
      }

      return true;
    } catch (e) {
      console.error("ResendEmailService.send failed:", e);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[DEV] Mock success sending email to ${payload.to} after crash`);
        return true;
      }
      return false;
    }
  }
}
