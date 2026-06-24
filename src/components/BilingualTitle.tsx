interface Props {
  en: string
  zh: string
  className?: string
}

export function BilingualTitle({ en, zh, className }: Props) {
  return (
    <div className={className}>
      <h1 className="font-sora font-bold text-[#1a1a1a] text-2xl leading-tight">{en}</h1>
      <p className="text-sm text-gray-500 mt-0.5">{zh}</p>
    </div>
  )
}
