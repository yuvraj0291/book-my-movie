import { Booking, Payment } from "@prisma/client";

export interface IBookingDetails extends Booking {
  show: {
    startTime: Date;
    movie: {
      title: string;
      posterUrl: string;
    };
    screen: {
      name: string;
      theatre: {
        name: string;
        city: string;
        address: string;
      };
    };
  };
  showSeats: {
    id: string;
    price: any; // Decimal type is converted to decimal object or custom shape in runtime, so typing any or Decimal matches
    seatId: string;
    seat: {
      row: string;
      number: number;
    };
  }[];
  payment: Payment | null;
}

export interface IBookingRepository {
  findById(id: string): Promise<IBookingDetails | null>;
  createPendingBooking(userId: string, showId: string, seatIds: string[], totalPrice: number): Promise<Booking>;
  confirmBooking(bookingId: string, transactionId: string, gateway: string, amount: number): Promise<boolean>;
  cancelBooking(bookingId: string): Promise<boolean>;
  findUserBookings(userId: string): Promise<IBookingDetails[]>;
}
