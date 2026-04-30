export type PaymentSuccessWhatsAppJobBody = {
  transactionId: string;
  userId: number;
  /** Channel BMI: 1 ATM, 2 Teller, 3 iBanking, 4 EDC, 5 mBanking */
  channelId?: string;
};
