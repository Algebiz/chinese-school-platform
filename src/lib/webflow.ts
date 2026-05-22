import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'

const WEBFLOW_BASE = 'https://api.webflow.com/v2'

interface ScheduleEntry {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ClassWithDetails {
  id: string
  name: string
  nameEn: string | null
  type: string
  description: string | null
  schedule: unknown
  fee: { toString(): string }
  capacity: number
  teacher: { name: string } | null
  spotsRemaining: number
}

interface WebflowItem {
  id: string
  fieldData: Record<string, unknown>
}

async function getWebflowHeaders(): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  const min = parseInt(mStr, 10)
  return min === 0 ? `${hour} ${period}` : `${hour}:${mStr} ${period}`
}

function formatSchedule(schedule: unknown): string {
  if (!Array.isArray(schedule) || schedule.length === 0) return 'TBD'
  const { dayOfWeek, startTime, endTime } = schedule[0] as ScheduleEntry
  const day = DAY_NAMES[dayOfWeek] ?? 'Unknown'
  if (!startTime || !endTime) return `Every ${day}`
  return `Every ${day}, ${formatTime(startTime)}–${formatTime(endTime)}`
}

function extractAgeRange(description: string | null): string {
  if (!description) return ''
  const match = description.match(/Ages\s+[\d–\-+]+/i)
  return match ? match[0] : ''
}

function classToFieldData(cls: ClassWithDetails): Record<string, unknown> {
  const displayName = cls.nameEn ?? cls.name
  return {
    name: displayName,
    slug: `class-${cls.id.slice(-12)}`,
    'chinese-name': cls.name,
    'class-type': cls.type === 'CHINESE' ? 'Chinese Class' : 'Arts Class',
    'teacher-name': cls.teacher?.name ?? '',
    'schedule-display': formatSchedule(cls.schedule),
    fee: Number(cls.fee.toString()),
    capacity: cls.capacity,
    'spots-remaining': cls.spotsRemaining,
    'is-full': cls.spotsRemaining === 0,
    'age-range': extractAgeRange(cls.description),
    description: cls.description ?? '',
    'class-id': cls.id,
  }
}

async function listCollectionItems(): Promise<WebflowItem[]> {
  const collectionId = process.env.WEBFLOW_COLLECTION_ID
  if (!collectionId) throw new Error('WEBFLOW_COLLECTION_ID is not set')
  const headers = await getWebflowHeaders()
  const items: WebflowItem[] = []
  let offset = 0

  while (true) {
    const res = await fetch(
      `${WEBFLOW_BASE}/collections/${collectionId}/items?limit=100&offset=${offset}`,
      { headers }
    )
    if (!res.ok) throw new Error(`Webflow list items failed: ${res.status}`)
    const data = await res.json()
    const page: WebflowItem[] = data.items ?? []
    items.push(...page)
    const total: number = data.pagination?.total ?? 0
    if (items.length >= total) break
    offset += 100
  }

  return items
}

async function createItem(fields: Record<string, unknown>): Promise<string> {
  const collectionId = process.env.WEBFLOW_COLLECTION_ID
  const headers = await getWebflowHeaders()
  const res = await fetch(`${WEBFLOW_BASE}/collections/${collectionId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ isArchived: false, isDraft: false, fieldData: fields }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Webflow create item failed: ${res.status} — ${body}`)
  }
  const data = await res.json()
  return data.id as string
}

async function updateItem(itemId: string, fields: Record<string, unknown>): Promise<void> {
  const collectionId = process.env.WEBFLOW_COLLECTION_ID
  const headers = await getWebflowHeaders()
  const res = await fetch(`${WEBFLOW_BASE}/collections/${collectionId}/items/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ isArchived: false, isDraft: false, fieldData: fields }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Webflow update item failed: ${res.status} — ${body}`)
  }
}

async function publishItems(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return
  const collectionId = process.env.WEBFLOW_COLLECTION_ID
  const headers = await getWebflowHeaders()
  const res = await fetch(`${WEBFLOW_BASE}/collections/${collectionId}/items/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ itemIds }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Webflow publish failed: ${res.status} — ${body}`)
  }
}

export async function syncClassToWebflow(classData: ClassWithDetails): Promise<void> {
  const existingItems = await listCollectionItems()
  const existing = existingItems.find((item) => item.fieldData['class-id'] === classData.id)
  const fields = classToFieldData(classData)

  let itemId: string
  if (existing) {
    await updateItem(existing.id, fields)
    itemId = existing.id
  } else {
    itemId = await createItem(fields)
  }

  await publishItems([itemId])
}

export async function syncAllClassesToWebflow(): Promise<{ synced: number; errors: string[] }> {
  const year = await getCurrentAcademicYear()
  const classes = await prisma.class.findMany({
    where: { year },
    include: {
      teacher: { select: { name: true } },
      _count: {
        select: { enrollments: { where: { status: 'CONFIRMED' } } },
      },
    },
  })

  // Fetch all existing Webflow items once and build a lookup map
  const existingItems = await listCollectionItems()
  const existingMap = new Map(
    existingItems
      .filter((item) => typeof item.fieldData['class-id'] === 'string')
      .map((item) => [item.fieldData['class-id'] as string, item.id])
  )

  const changedItemIds: string[] = []
  const errors: string[] = []

  for (const cls of classes) {
    try {
      const classWithDetails: ClassWithDetails = {
        ...cls,
        spotsRemaining: Math.max(0, cls.capacity - cls._count.enrollments),
      }

      const fields = classToFieldData(classWithDetails)
      const existingItemId = existingMap.get(cls.id)

      let itemId: string
      if (existingItemId) {
        await updateItem(existingItemId, fields)
        itemId = existingItemId
      } else {
        itemId = await createItem(fields)
      }

      changedItemIds.push(itemId)
    } catch (err) {
      errors.push(`${cls.nameEn ?? cls.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  try {
    await publishItems(changedItemIds)
  } catch (err) {
    errors.push(`Publish batch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { synced: changedItemIds.length, errors }
}
