// Shared design-system helpers used across portal client components

export type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'pink' | 'gray' | 'purple'

const BADGE_COLORS: Record<BadgeColor, { bg: string; color: string }> = {
  green:  { bg: '#EAF3DE', color: '#3B6D11' },
  amber:  { bg: '#FAEEDA', color: '#BA7517' },
  red:    { bg: '#FCEBEB', color: '#A32D2D' },
  blue:   { bg: '#E6F1FB', color: '#185FA5' },
  pink:   { bg: '#FBEAF0', color: '#993556' },
  gray:   { bg: '#F3F4F6', color: '#4B5563' },
  purple: { bg: '#F3F0FA', color: '#6B46C1' },
}

export function badge(color: BadgeColor): React.CSSProperties {
  const c = BADGE_COLORS[color]
  return {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: c.bg,
    color: c.color,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }
}

export const ICON_BOX_COLORS = {
  red:    '#FEF3F2',
  blue:   '#E6F1FB',
  green:  '#EAF3DE',
  pink:   '#FBEAF0',
  amber:  '#FEF9EB',
  gray:   '#F3F4F6',
  purple: '#F3F0FA',
}

export function iconBox(color: keyof typeof ICON_BOX_COLORS, size = 36): React.CSSProperties {
  return {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: 8,
    backgroundColor: ICON_BOX_COLORS[color],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.5,
  }
}

export const CARD: React.CSSProperties = {
  border: '0.5px solid #E5E7EB',
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: 'var(--color-background-primary)',
}

export const CARD_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'var(--color-background-secondary)',
  padding: '14px 16px',
  borderBottom: '0.5px solid #E5E7EB',
}

export const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderBottom: '0.5px solid #E5E7EB',
}

export const ROW_LAST: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
}
