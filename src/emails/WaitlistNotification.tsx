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
import { Footer } from './WelcomeEmail'

export interface WaitlistNotificationProps {
  parentName: string
  studentName: string
  className: string
  position: number
}

export function WaitlistNotification({
  parentName,
  studentName,
  className,
  position,
}: WaitlistNotificationProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>候补名单确认 — {studentName} / Waitlist Confirmed — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://chinese-school-platform.vercel.app/logo.png"
              alt="Charlotte Chinese Academy"
              width="80"
              height="80"
              style={{ margin: '0 auto 12px', display: 'block' }}
            />
            <Heading style={schoolZh}>夏洛特中文学校</Heading>
            <Text style={schoolEn}>Charlotte Chinese Academy</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={h2}>候补名单确认</Heading>
            <Text style={subtitle}>Waitlist Confirmation</Text>

            <Text style={p}>亲爱的 {parentName}，</Text>
            <Text style={p}>
              <strong>{studentName}</strong> 已成功加入 <strong>{className}</strong> 的候补名单。
            </Text>
            <Text style={pEn}>
              <strong>{studentName}</strong> has been added to the waitlist for <strong>{className}</strong>.
            </Text>

            {/* Position badge */}
            <Section style={positionBox}>
              <Text style={positionLabel}>当前候补位置 / Current Waitlist Position</Text>
              <Text style={positionNumber}>#{position}</Text>
              <Text style={positionNote}>位置越小，获得名额的机会越大</Text>
              <Text style={{ ...positionNote, color: '#9ca3af' }}>A smaller number means a higher chance of being enrolled</Text>
            </Section>

            <Text style={p}>
              当有名额空出时，我们将第一时间通过邮件通知您。届时请及时登录系统完成报名，以免错过机会。
            </Text>
            <Text style={pEn}>
              When a spot becomes available, we will notify you immediately by email. Please log in promptly to complete your enrollment so you don't miss out.
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

const header: React.CSSProperties = {
  backgroundColor: '#dc2626',
  padding: '28px 32px 20px',
  textAlign: 'center',
}

const schoolZh: React.CSSProperties = {
  color: '#ffffff', fontSize: 24, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em',
}

const schoolEn: React.CSSProperties = { color: '#fecaca', fontSize: 13, margin: '4px 0 0' }

const content: React.CSSProperties = { padding: '28px 32px' }

const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }

const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 20px' }

const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }

const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }

const positionBox: React.CSSProperties = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: 8,
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center',
}

const positionLabel: React.CSSProperties = {
  color: '#0369a1',
  fontSize: 13,
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const positionNumber: React.CSSProperties = {
  color: '#0c4a6e',
  fontSize: 48,
  fontWeight: 'bold',
  margin: '0 0 8px',
  lineHeight: 1,
}

const positionNote: React.CSSProperties = {
  color: '#0369a1',
  fontSize: 12,
  margin: '4px 0 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
