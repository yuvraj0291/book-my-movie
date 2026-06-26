import { IBookingRepository } from "@/core/repositories/IBookingRepository";
import { IPaymentService } from "@/core/services/IPaymentService";
import { IEmailService } from "@/core/services/IEmailService";
import { ICacheService } from "@/core/services/ICacheService";

export class ConfirmBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private paymentService: IPaymentService,
    private emailService: IEmailService,
    private cacheService: ICacheService
  ) {}

  async execute(
    bookingId: string,
    gateway: "STRIPE" | "RAZORPAY",
    paymentPayload: any,
    userEmail: string
  ): Promise<boolean> {
    try {
      const verified = await this.paymentService.verifyPayment({
        gateway,
        ...paymentPayload,
      });

      if (!verified) {
        console.error(`Payment verification failed for booking ${bookingId}`);
        return false;
      }

      const booking = await this.bookingRepository.findById(bookingId);
      if (!booking) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const transactionId = gateway === "STRIPE" 
        ? paymentPayload.stripePaymentIntentId 
        : paymentPayload.razorpayPaymentId;

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

      const seatIds = booking.showSeats.map(s => s.seatId);
      for (const seatId of seatIds) {
        const lockKey = `lock:show:${booking.showId}:seat:${seatId}`;
        await this.cacheService.del(lockKey);
      }

      const seatLabels = booking.showSeats.map(s => `${s.seat.row}-${s.seat.number}`).join(", ");
      const formattedDate = new Date(booking.show.startTime).toLocaleString();

      await this.emailService.send({
        to: userEmail,
        subject: "Your Movie Tickets are Confirmed! 🍿",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #e11d48; text-align: center;">Ticket Confirmation</h2>
            <p>Hi there,</p>
            <p>Thank you for booking with MovieRocks. Your tickets are confirmed!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <h3>Booking Details:</h3>
            <table style="width: 100%; text-align: left;">
              <tr><th>Movie:</th><td>${booking.show.movie.title}</td></tr>
              <tr><th>Theatre:</th><td>${booking.show.screen.theatre.name}</td></tr>
              <tr><th>Screen:</th><td>${booking.show.screen.name}</td></tr>
              <tr><th>Time:</th><td>${formattedDate}</td></tr>
              <tr><th>Seats:</th><td>${seatLabels}</td></tr>
              <tr><th>Amount Paid:</th><td>$${booking.totalPrice}</td></tr>
              <tr><th>Booking ID:</th><td>${booking.id}</td></tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888; text-align: center;">Enjoy your movie!</p>
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
