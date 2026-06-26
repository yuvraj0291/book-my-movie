import { CreateOrderResult, IPaymentService } from "@/core/services/IPaymentService";
import { stripe } from "@/lib/stripe";
import Razorpay from "razorpay";
import crypto from "crypto";

export class StripeRazorpayPaymentService implements IPaymentService {
  private razorpay: Razorpay | null = null;

  constructor() {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    bookingId: string,
    gateway: "STRIPE" | "RAZORPAY"
  ): Promise<CreateOrderResult> {
    const amountInSubunits = Math.round(amount * 100);

    if (gateway === "STRIPE") {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInSubunits,
          currency: currency.toLowerCase(),
          metadata: { bookingId },
        });

        return {
          id: paymentIntent.id,
          amount,
          currency,
          clientSecret: paymentIntent.client_secret || undefined,
          gateway: "STRIPE",
        };
      } catch (e) {
        console.error("Stripe createPaymentIntent failed:", e);
        throw new Error("Failed to initialize Stripe payment");
      }
    } else {
      if (!this.razorpay) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Razorpay credentials missing. Returning mock Razorpay order.");
          return {
            id: `order_mock_${Math.random().toString(36).substring(7)}`,
            amount,
            currency,
            gateway: "RAZORPAY",
          };
        }
        throw new Error("Razorpay credentials not configured");
      }

      try {
        const order = await this.razorpay.orders.create({
          amount: amountInSubunits,
          currency: currency.toUpperCase(),
          receipt: bookingId,
          notes: { bookingId },
        });

        return {
          id: order.id,
          amount,
          currency,
          gateway: "RAZORPAY",
        };
      } catch (e) {
        console.error("Razorpay order creation failed:", e);
        throw new Error("Failed to initialize Razorpay payment");
      }
    }
  }

  async verifyPayment(payload: {
    gateway: "STRIPE" | "RAZORPAY";
    stripePaymentIntentId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }): Promise<boolean> {
    if (payload.gateway === "STRIPE") {
      try {
        const paymentIntentId = payload.stripePaymentIntentId;
        if (!paymentIntentId) return false;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent.status === "succeeded";
      } catch (e) {
        console.error("Stripe verification failed:", e);
        return false;
      }
    } else {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;
      if (!razorpayOrderId || !razorpayPaymentId) return false;

      if (!this.razorpay) {
        if (process.env.NODE_ENV !== "production") {
          return razorpayOrderId.startsWith("order_mock_") || razorpayPaymentId.startsWith("pay_mock_");
        }
        return false;
      }

      if (!razorpaySignature) {
        try {
          const payment: any = await this.razorpay.payments.fetch(razorpayPaymentId);
          return payment.status === "captured";
        } catch (e) {
          console.error("Razorpay API status check failed:", e);
          return false;
        }
      }

      if (!process.env.RAZORPAY_KEY_SECRET) return false;

      try {
        const generatedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest("hex");

        return generatedSignature === razorpaySignature;
      } catch (e) {
        console.error("Razorpay verification failed:", e);
        return false;
      }
    }
  }
}
