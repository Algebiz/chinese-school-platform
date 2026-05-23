import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Img,
  Text,
} from '@react-email/components'
import { EmailHeader, Footer } from './WelcomeEmail'

export interface ClassChangeNotificationProps {
  parentName: string
  studentName: string
  fromClass: string
  toClass: string
  reason: string
}

export function ClassChangeNotification({
  parentName,
  studentName,
  fromClass,
  toClass,
  reason,
}: ClassChangeNotificationProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>班级调整通知 — {studentName} / Class Transfer Notice — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>班级调整通知</Heading>
            <Text style={subtitle}>Class Transfer Notice</Text>

            <Text style={p}>亲爱的 {parentName}，</Text>
            <Text style={p}>
              我们通知您，<strong>{studentName}</strong> 的班级安排已作调整，具体如下：
            </Text>
            <Text style={pEn}>
              We are writing to inform you that <strong>{studentName}</strong>'s class assignment has been updated as follows:
            </Text>

            {/* Transfer box */}
            <Section style={transferBox}>
              <Section style={transferRow}>
                <Text style={transferLabel}>原班级 / Previous Class</Text>
                <Text style={transferFrom}>{fromClass}</Text>
              </Section>
              <Text style={arrow}>↓</Text>
              <Section style={transferRow}>
                <Text style={transferLabel}>新班级 / New Class</Text>
                <Text style={transferTo}>{toClass}</Text>
              </Section>
            </Section>

            {/* Reason */}
            <Section style={reasonBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>调整原因 / Reason for Change</Text>
              <Text style={{ ...p, margin: 0 }}>{reason}</Text>
            </Section>

            <Text style={p}>
              如有任何疑问，请尽快联系招生处，我们将尽力协助您。
            </Text>
            <Text style={pEn}>
              If you have any questions or concerns, please contact our admissions office at your earliest convenience.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '32px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  margin: '0 auto',
  maxWidth: 560,
  overflow: 'hidden',
}


const content: React.CSSProperties = { padding: '28px 32px' }

const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }

const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 20px' }

const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }

const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }

const transferBox: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '16px 20px',
  margin: '20px 0',
  textAlign: 'center',
}

const transferRow: React.CSSProperties = { margin: '8px 0' }

const transferLabel: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 4px',
}

const transferFrom: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 15,
  textDecoration: 'line-through',
  margin: 0,
}

const transferTo: React.CSSProperties = {
  color: '#dc2626',
  fontSize: 16,
  fontWeight: 'bold',
  margin: 0,
}

const arrow: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 20,
  margin: '4px 0',
  textAlign: 'center',
}

const reasonBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
