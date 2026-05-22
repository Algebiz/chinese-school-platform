export function getClassSortKey(name: string, type: string): string {
  if (type === 'ARTS') return 'Z_' + name

  // AP Chinese → last among CHL
  if (name === 'AP Chinese') return 'A_99_'

  // CHL before CSL
  const program = name.startsWith('CSL') ? 'B' : 'A'

  const match = name.match(/Level (\d+)\s*(.*)/)
  if (match) {
    const level = match[1].padStart(2, '0')
    const suffix = match[2].trim()
    // blank → sorts first; Intensive → sorts last; A/B/C/… sort alphabetically
    const suffixOrder = suffix === '' ? '0' : suffix === 'Intensive' ? 'Z' : suffix
    return `${program}_${level}_${suffixOrder}`
  }

  return `${program}_${name}`
}

export function sortClasses<T extends { nameEn?: string | null; name?: string; type?: string }>(
  classes: T[]
): T[] {
  return [...classes].sort((a, b) => {
    const keyA = getClassSortKey(a.nameEn ?? a.name ?? '', a.type ?? '')
    const keyB = getClassSortKey(b.nameEn ?? b.name ?? '', b.type ?? '')
    return keyA.localeCompare(keyB)
  })
}
