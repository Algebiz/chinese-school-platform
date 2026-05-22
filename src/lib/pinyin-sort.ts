/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
const pinyinModule: any = require('pinyin')
// The package may export the function directly (CJS) or under .default (ESM interop)
const pinyinFn: (str: string, opts: { style: number }) => string[][] =
  typeof pinyinModule === 'function' ? pinyinModule : pinyinModule.default
const STYLE_NORMAL: number = (pinyinFn as any)?.STYLE_NORMAL ?? pinyinModule?.STYLE_NORMAL ?? 0

export function getLastNamePinyin(chineseName: string | null | undefined): string {
  if (!chineseName?.trim()) return 'zzz'
  const firstChar = chineseName[0]
  // CJK unified ideograph range
  if (/[一-鿿㐀-䶿]/.test(firstChar)) {
    try {
      const result: string[][] = pinyinFn(firstChar, { style: STYLE_NORMAL })
      return result[0]?.[0] ?? firstChar.toLowerCase()
    } catch {
      return firstChar.toLowerCase()
    }
  }
  // Latin / English — sort by full name
  return chineseName.toLowerCase()
}

export function sortByLastNamePinyin<T>(
  items: T[],
  nameKey: (item: T) => string | null | undefined,
  fallbackKey?: (item: T) => string | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    const na = nameKey(a)
    const nb = nameKey(b)
    const keyA = getLastNamePinyin(na) !== 'zzz' ? getLastNamePinyin(na) : getLastNamePinyin(fallbackKey?.(a))
    const keyB = getLastNamePinyin(nb) !== 'zzz' ? getLastNamePinyin(nb) : getLastNamePinyin(fallbackKey?.(b))
    if (keyA < keyB) return -1
    if (keyA > keyB) return 1
    return (na ?? '').localeCompare(nb ?? '', 'zh-CN')
  })
}
