import type { StudentStatus } from '@/lib/student-status'

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  if (status === 'RETURNING') {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        老生 / Returning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
      新生 / New
    </span>
  )
}
