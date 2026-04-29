import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { CheckoutValidationError, finalizePortalCheckout } from '@/lib/data/server/checkout';
import type { PortalCheckoutCartItem } from '@/lib/data/portal-payment';
import { scheduleCheckoutWhatsAppJob } from '@/lib/qstash/schedule-checkout-whatsapp';

export async function POST(request: Request) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { cart?: PortalCheckoutCartItem[]; paymentMethodId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const cart = body.cart;
  const paymentMethodId = Number(body.paymentMethodId);
  if (!Array.isArray(cart) || !Number.isFinite(paymentMethodId) || paymentMethodId <= 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  try {
    const checkout = await finalizePortalCheckout({
      viewerUserId: userId,
      viewerRole: role,
      cart,
      paymentMethodId,
    });

    void scheduleCheckoutWhatsAppJob({
      transactionId: checkout.transactionId,
      transactionCreatedAt: checkout.transactionCreatedAt,
      userId,
    }).catch((err) => {
      console.error('checkout_whatsapp_schedule', err);
    });

    return NextResponse.json({
      referenceNo: checkout.referenceNo,
      transactionId: checkout.transactionId,
      transactionCreatedAt: checkout.transactionCreatedAt,
      totalAmount: checkout.totalAmount,
      vaNo: checkout.vaNo,
      vaDisplay: checkout.vaDisplay,
      expiryAt: checkout.expiryAt,
      isBmi: checkout.isBmi,
      instructionRows: checkout.instructionRows,
    });
  } catch (e) {
    if (e instanceof CheckoutValidationError) {
      return NextResponse.json(
        { error: e.code, messageId: e.messageId, messageEn: e.messageEn },
        { status: 422 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
