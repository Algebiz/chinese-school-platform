import { NextRequest, NextResponse } from 'next/server'
import { syncAllClassesToWebflow } from '@/lib/webflow'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.WEBFLOW_API_KEY) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncAllClassesToWebflow()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Webflow sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        code: 'SYNC_ERROR',
      },
      { status: 500 }
    )
  }
}
