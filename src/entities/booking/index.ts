export type BookingEntity = {
  id: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  paymentStatus: string;
  status: string;
};
