import { BadRequestException, Injectable } from '@nestjs/common';
import { generateCode } from '../common/codes';

export const PAYMENT_METHODS = ['UPI', 'CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

@Injectable()
export class MockPaymentService {
  async charge(amount: number, method: PaymentMethod) {
    if (amount <= 0) throw new BadRequestException('Invalid payment amount');
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { success: true, reference: generateCode(`PAY-${method}`) };
  }
}
