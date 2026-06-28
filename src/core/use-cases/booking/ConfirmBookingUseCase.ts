import { IBookingRepository } from "@/core/repositories/IBookingRepository";
import { IPaymentService } from "@/core/services/IPaymentService";
import { IEmailService } from "@/core/services/IEmailService";
import { ICacheService } from "@/core/services/ICacheService";
import { IAuditLogRepository } from "@/core/repositories/IAuditLogRepository";
import QRCode from "qrcode";
import crypto from "crypto";

export class ConfirmBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private paymentService: IPaymentService,
    private emailService: IEmailService,
    private cacheService: ICacheService,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(
    bookingId: string,
    gateway: "STRIPE" | "RAZORPAY",
    paymentPayload: any,
    userEmail: string
  ): Promise<boolean> {
    try {
      // 1. Fetch booking details
      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      // Idempotency: If booking is already confirmed, return success immediately
      if (booking.status === "CONFIRMED") {
        console.log(`Booking ${bookingId} is already CONFIRMED (Idempotency check passed)`);
        return true;
      }

      // 2. Verify payment details
      const verified = await this.paymentService.verifyPayment({
        gateway,
        ...paymentPayload,
      });

      if (!verified) {
        console.error(`Payment verification failed for booking ${bookingId}`);
        return false;
      }

      const transactionId = gateway === "STRIPE" 
        ? paymentPayload.stripePaymentIntentId 
        : paymentPayload.razorpayPaymentId;

      // 3. Confirm booking in database
      const confirmed = await this.bookingRepository.confirmBooking(
        bookingId,
        transactionId,
        gateway,
        Number(booking.totalPrice)
      );

      if (!confirmed) {
        console.error(`Failed to confirm booking ${bookingId} in database`);
        return false;
      }

      // 4. Create Audit Log
      await this.auditLogRepository.create(
        booking.userId,
        "BOOKING_CONFIRM",
        `Confirmed booking ${bookingId} via ${gateway} with transaction ${transactionId}`
      );

      // 5. Release seat locks in Redis cache
      const seatIds = booking.showSeats.map(s => s.seatId);
      for (const seatId of seatIds) {
        const lockKey = `lock:show:${booking.showId}:seat:${seatId}`;
        await this.cacheService.del(lockKey);
      }

      // 6. Generate QR Code containing booking details & security validation hash
      const salt = "movierocks_secure_salt_2026";
      const validationHash = crypto
        .createHash("sha256")
        .update(`${bookingId}-${booking.showId}-${booking.userId}-${salt}`)
        .digest("hex");

      const qrPayload = JSON.stringify({
        bookingId,
        theatre: booking.show.screen.theatre.name,
        screen: booking.show.screen.name,
        movie: booking.show.movie.title,
        seats: booking.showSeats.map(s => `${s.seat.row}-${s.seat.number}`),
        startTime: booking.show.startTime,
        hash: validationHash.substring(0, 16),
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

      // 7. Send confirmation email with QR Code embedded
      const seatLabels = booking.showSeats.map(s => `${s.seat.row}-${s.seat.number}`).join(", ");
      const formattedDate = new Date(booking.show.startTime).toLocaleString();

      await this.emailService.send({
        to: userEmail,
        subject: "Your Movie Tickets are Confirmed! 🍿",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">🍿</span>
              <h2 style="color: #e11d48; margin: 8px 0 0 0; font-weight: 800; font-size: 24px;">Booking Confirmed</h2>
              <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">Show this QR code at the cinema entrance</p>
            </div>
            
            <div style="text-align: center; margin: 24px 0; background-color: #fafafa; padding: 16px; border-radius: 12px; border: 1px dashed #e4e4e7;">
              <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto;" />
              <span style="font-family: monospace; font-size: 11px; color: #a1a1aa; display: block; margin-top: 8px;">Reference: ${bookingId}</span>
            </div>

            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            
            <h3 style="margin-top: 0; font-size: 16px; font-weight: 700; color: #18181b;">Booking Details:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Movie</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.movie.title}</td></tr>
              <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Theatre</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.screen.theatre.name}</td></tr>
              <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Screen</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${booking.show.screen.name}</td></tr>
              <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Time</th><td style="text-align: right; padding: 8px 0; font-weight: 600;">${formattedDate}</td></tr>
              <tr style="border-bottom: 1px solid #f4f4f5;"><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Seats</th><td style="text-align: right; padding: 8px 0; font-weight: 700; color: #e11d48;">${seatLabels}</td></tr>
              <tr><th style="text-align: left; padding: 8px 0; color: #71717a; font-weight: 500;">Amount Paid</th><td style="text-align: right; padding: 8px 0; font-weight: 700; color: #10b981;">$${booking.totalPrice}</td></tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            
            <div style="text-align: center; font-size: 12px; color: #a1a1aa; font-style: italic;">
              Thank you for choosing MovieRocks! Have an amazing show. 🍿
            </div>
          </div>
        `,
      });

      return true;
    } catch (e) {
      console.error("ConfirmBookingUseCase error:", e);
      return false;
    }
  }
}
