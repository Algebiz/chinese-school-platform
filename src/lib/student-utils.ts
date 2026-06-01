export function getYearsAtCCA(firstEnrollmentYear: string | null | undefined): number {
  if (!firstEnrollmentYear) return 0
  const startYear = parseInt(firstEnrollmentYear.split('-')[0], 10)
  if (isNaN(startYear)) return 0
  const currentYear = new Date().getFullYear()
  return Math.max(0, currentYear - startYear)
}

export function getYearsLabel(years: number, lang: string): string {
  const n = years + 1
  if (lang === 'zh') return `第${n}年`
  if (n === 1) return '1st year'
  if (n === 2) return '2nd year'
  if (n === 3) return '3rd year'
  return `${n}th year`
}
