// Maps each class's English name to the names of classes at the next level.
// Matched against the Class.nameEn field.
export const CLASS_LEVEL_PROGRESSION: Record<string, string[]> = {
  'Toddler Class A': ['Beginner Class 1', 'Beginner Class 2'],
  'Toddler Class B': ['Beginner Class 1', 'Beginner Class 2'],
  'Beginner Class 1': ['Intermediate Class 1', 'Intermediate Class 2'],
  'Beginner Class 2': ['Intermediate Class 1', 'Intermediate Class 2'],
  'Intermediate Class 1': ['Intermediate Class 3', 'Intermediate Class 4'],
  'Intermediate Class 2': ['Intermediate Class 3', 'Intermediate Class 4'],
  'Intermediate Class 3': ['Advanced Class 1', 'Advanced Class 2'],
  'Intermediate Class 4': ['Advanced Class 1', 'Advanced Class 2'],
  'Advanced Class 1': [],
  'Advanced Class 2': [],
}

export function deriveNextYear(year: string): string {
  const [start, end] = year.split('-').map(Number)
  return `${start + 1}-${end + 1}`
}
