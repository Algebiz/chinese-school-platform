import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { getAccessToken, PAYPAL_BASE } from '@/lib/paypal'

export async function processStripeDepositRefund(
  depositId: string,
  adminUserId: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const deposit = await prisma.volunteerDeposit.findUnique({
    where: { id: depositId },
  })

  if (!deposit) return { success: false, error: 'Deposit not found' }
  if (!deposit.stripePaymentIntentId) {
    return { success: false, error: 'No Stripe payment found for this deposit' }
  }
  if (deposit.status !== 'CLAIM_APPROVED') {
    return { success: false, error: 'Deposit must be approved before refund' }
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: deposit.stripePaymentIntentId,
      amount: Math.round(Number(deposit.amount) * 100),
      reason: 'requested_by_customer',
      metadata: {
        depositId: deposit.id,
        familyId: deposit.familyId,
        academicYear: deposit.academicYear,
        adminUserId,
      },
    })

    await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: adminUserId,
        stripeRefundId: refund.id,
        refundMethod: 'stripe',
        refundAmount: deposit.amount,
      },
    })

    return { success: true, refundId: refund.id }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REFUND_FAILED',
        refundFailReason: message,
      },
    })
    return { success: false, error: message }
  }
}

export async function processPayPalDepositRefund(
  depositId: string,
  adminUserId: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const deposit = await prisma.volunteerDeposit.findUnique({
    where: { id: depositId },
  })

  if (!deposit) return { success: false, error: 'Deposit not found' }
  if (!deposit.paypalOrderId) {
    return { success: false, error: 'No PayPal payment found for this deposit' }
  }

  try {
    const accessToken = await getAccessToken()

    const orderResponse = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${deposit.paypalOrderId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const order = await orderResponse.json() as {
      purchase_units?: { payments?: { captures?: { id: string }[] } }[]
    }
    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id

    if (!captureId) {
      return { success: false, error: 'PayPal capture ID not found' }
    }

    const refundResponse = await fetch(
      `${PAYPAL_BASE}/v2/payments/captures/${captureId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            value: Number(deposit.amount).toFixed(2),
            currency_code: 'USD',
          },
          note_to_payer: 'Volunteer service deposit refund — Charlotte Chinese Academy',
        }),
      }
    )

    const refundData = await refundResponse.json() as { id?: string; message?: string }

    if (!refundResponse.ok) {
      throw new Error(refundData.message ?? 'PayPal refund failed')
    }

    await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: adminUserId,
        paypalRefundId: refundData.id,
        refundMethod: 'paypal',
        refundAmount: deposit.amount,
      },
    })

    return { success: true, refundId: refundData.id }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REFUND_FAILED',
        refundFailReason: message,
      },
    })
    return { success: false, error: message }
  }
}

export async function processDepositRefund(
  depositId: string,
  adminUserId: string
): Promise<{ success: boolean; refundId?: string; refundMethod?: string; error?: string }> {
  const deposit = await prisma.volunteerDeposit.findUnique({
    where: { id: depositId },
  })

  if (!deposit) return { success: false, error: 'Deposit not found' }

  if (deposit.stripePaymentIntentId) {
    const result = await processStripeDepositRefund(depositId, adminUserId)
    return { ...result, refundMethod: 'stripe' }
  } else if (deposit.paypalOrderId) {
    const result = await processPayPalDepositRefund(depositId, adminUserId)
    return { ...result, refundMethod: 'paypal' }
  } else {
    return {
      success: false,
      error: 'No payment method found — deposit may have been created manually',
    }
  }
}
