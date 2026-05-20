const BASE_URL = 'https://api-m.sandbox.paypal.com'

export interface PayPalCaptureResult {
  id: string
  status: string
  purchase_units: {
    payments: {
      captures: {
        id: string
        status: string
        amount: { value: string; currency_code: string }
      }[]
    }
  }[]
}

export async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function createOrder(
  amount: number,
  currency: string,
  metadata: object
): Promise<string> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          // Store metadata as custom_id (PayPal limit: 127 chars)
          custom_id: JSON.stringify(metadata).slice(0, 127),
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal createOrder failed: ${res.status} ${err}`)
  }

  const data = await res.json() as { id: string }
  return data.id
}

export async function captureOrder(orderId: string): Promise<PayPalCaptureResult> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal captureOrder failed: ${res.status} ${err}`)
  }

  return res.json() as Promise<PayPalCaptureResult>
}
