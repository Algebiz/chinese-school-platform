import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailHeader, Footer } from './WelcomeEmail'

export interface WaitlistSpotAvailableProps {
  parentName: string
  studentName: string
  className: string
  expiryDate: Date
  enrollUrl: string
}

export function WaitlistSpotAvailable({
  parentName,
  studentName,
  className,
  expiryDate,
  enrollUrl,
}: WaitlistSpotAvailableProps) {
  const expiryStr = expiryDate.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Html lang="zh">
      <Head />
      <Preview>候补名额通知 / Waitlist Spot Available — {className}</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>尊敬的 {parentName}，</Heading>
            <Text style={subtitle}>Dear {parentName},</Text>

            <Text style={p}>
              好消息！<strong>{className}</strong> 出现了空余名额。
            </Text>
            <Text style={pEn}>
              Great news! A spot has opened in <strong>{className}</strong>.
            </Text>

            <Text style={p}>
              您的孩子 <strong>{studentName}</strong> 在候补名单中排队等候，现在可以完成报名了。
            </Text>
            <Text style={pEn}>
              Your child <strong>{studentName}</strong> was on the waitlist and can now complete enrollment.
            </Text>

            <Section style={warningBox}>
              <Text style={{ ...p, margin: 0, color: '#92400e', fontWeight: 'bold' }}>
                ⚠️ 请在 {expiryStr} 前完成报名，否则名额将让给下一位候补学生。
              </Text>
              <Text style={{ ...pEn, margin: '4px 0 0', color: '#b45309' }}>
                Please complete enrollment by {expiryStr}, otherwise the spot will be offered to the next student on the waitlist.
              </Text>
            </Section>

            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={enrollUrl} style={button}>
                立即完成报名 / Complete Enrollment Now
              </Button>
            </Section>

            <Text style={p}>如有问题请联系招生处。</Text>
            <Text style={pEn}>Please contact our admissions office if you have any questions.</Text>
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

const warningBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '16px',
  margin: '16px 0',
}

const button: React.CSSProperties = {
  backgroundColor: '#CC0000',
  borderRadius: 6,
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 'bold',
  padding: '12px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
