export const CLASS_ORDER: string[] = [
  'CHL Level 1A',
  'CHL Level 1B',
  'CHL Level 2',
  'CHL Level 3A',
  'CHL Level 3B',
  'CHL Level 4A',
  'CHL Level 4B',
  'CHL Level 4 Intensive',
  'CHL Level 5',
  'CHL Level 6',
  'CHL Level 7',
  'CHL Level 8',
  'CHL Level 9',
  'CHL Level 9 Intensive',
  'AP Chinese',
  'CSL Level 1A',
  'CSL Level 1B',
  'CSL Level 2',
  'CSL Level 3',
]

// Sorts any array of objects that have nameEn and optionally type.
// Language classes (CHINESE) follow CLASS_ORDER; arts follow alphabetically after.
export function sortClasses<T extends { nameEn?: string | null; type?: string }>(
  classes: T[]
): T[] {
  return [...classes].sort((a, b) => {
    const aIsArts = a.type === 'ARTS'
    const bIsArts = b.type === 'ARTS'
    if (aIsArts !== bIsArts) return aIsArts ? 1 : -1
    if (aIsArts && bIsArts) return (a.nameEn ?? '').localeCompare(b.nameEn ?? '')
    const ai = CLASS_ORDER.indexOf(a.nameEn ?? '')
    const bi = CLASS_ORDER.indexOf(b.nameEn ?? '')
    if (ai === -1 && bi === -1) return (a.nameEn ?? '').localeCompare(b.nameEn ?? '')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
