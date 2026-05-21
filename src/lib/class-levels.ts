export const CHL_PROGRESSION: Record<string, string[]> = {
  'CHL Level 1A': ['CHL Level 2'],
  'CHL Level 1B': ['CHL Level 2'],
  'CHL Level 2': ['CHL Level 3A', 'CHL Level 3B'],
  'CHL Level 3A': ['CHL Level 4A', 'CHL Level 4B', 'CHL Level 4 Intensive'],
  'CHL Level 3B': ['CHL Level 4A', 'CHL Level 4B', 'CHL Level 4 Intensive'],
  'CHL Level 4A': ['CHL Level 5'],
  'CHL Level 4B': ['CHL Level 5'],
  'CHL Level 4 Intensive': ['CHL Level 5'],
  'CHL Level 5': ['CHL Level 6'],
  'CHL Level 6': ['CHL Level 7'],
  'CHL Level 7': ['CHL Level 8'],
  'CHL Level 8': ['CHL Level 9', 'CHL Level 9 Intensive'],
  'CHL Level 9': ['AP Chinese'],
  'CHL Level 9 Intensive': ['AP Chinese'],
  'AP Chinese': [],
}

export const CSL_PROGRESSION: Record<string, string[]> = {
  'CSL Level 1A': ['CSL Level 2'],
  'CSL Level 1B': ['CSL Level 2'],
  'CSL Level 2': ['CSL Level 3'],
  'CSL Level 3': [],
}

// Combined map used by re-enrollment-logic.ts
export const CLASS_LEVEL_PROGRESSION: Record<string, string[]> = {
  ...CHL_PROGRESSION,
  ...CSL_PROGRESSION,
}

export function deriveNextYear(year: string): string {
  const [start, end] = year.split('-').map(Number)
  return `${start + 1}-${end + 1}`
}
