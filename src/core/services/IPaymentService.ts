export interface CreateOrderResult {
  id: string; // The session id (Stripe) or order id (Razorpay)
  amount: number;
  currency: string;
  clientSecret?: string; // Needed for Stripe elements checkout
  gateway: "STRIPE" | "RAZORPAY";
}

export interface IPaymentService {
  createPaymentIntent(amount: number, currency: string, bookingId: string, gateway: "STRIPE" | "RAZORPAY"): Promise<CreateOrderResult>;
  verifyPayment(payload: any): Promise<boolean>;
}
