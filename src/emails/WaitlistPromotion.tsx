import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { Footer } from './WelcomeEmail'

export interface WaitlistPromotionProps {
  parentName: string
  studentName: string
  className: string
  requiresPayment?: boolean
}

export function WaitlistPromotion({
  parentName,
  studentName,
  className,
  requiresPayment = true,
}: WaitlistPromotionProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>恭喜！{studentName} 获得 {className} 名额 / Spot Available — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={schoolZh}>XX中文学校</Heading>
            <Text style={schoolEn}>XX Chinese School</Text>
          </Section>

          <Section style={content}>
            {/* Celebration badge */}
            <Section style={celebrationBox}>
              <Text style={celebrationIcon}>🎉</Text>
              <Text style={celebrationText}>有名额了！/ A Spot is Available!</Text>
            </Section>

            <Heading as="h2" style={h2}>恭喜，{parentName}！</Heading>
            <Text style={subtitle}>Congratulations, {parentName}!</Text>

            <Text style={p}>
              好消息！<strong>{studentName}</strong> 在 <strong>{className}</strong> 的候补名单上已有名额空出，您的孩子已从候补名单晋升为正式注册。
            </Text>
            <Text style={pEn}>
              Great news! A spot has opened up for <strong>{studentName}</strong> in <strong>{className}</strong>. Your child has been moved from the waitlist to confirmed enrollment.
            </Text>

            {requiresPayment && (
              <>
                <Section style={actionBox}>
                  <Text style={{ ...p, margin: '0 0 8px', fontWeight: 'bold', color: '#dc2626' }}>
                    ⚡ 请立即完成支付 / Action Required: Complete Payment
                  </Text>
                  <Text style={{ ...p, margin: 0 }}>
                    为确保名额，请尽快登录系统完成支付。若未能及时支付，名额将转给下一位候补学生。
                  </Text>
                  <Text style={{ ...pEn, margin: 0 }}>
                    To secure this spot, please log in and complete payment as soon as possible. If payment is not completed in time, the spot may be offered to the next student on the waitlist.
                  </Text>
                </Section>
              </>
            )}

            {!requiresPayment && (
              <Section style={{ ...actionBox, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Text style={{ ...p, margin: 0, color: '#166534' }}>
                  ✓ 您的报名已自动确认，无需额外操作。
                </Text>
                <Text style={{ ...pEn, margin: 0, color: '#166534' }}>
                  Your enrollment has been automatically confirmed. No further action is required.
                </Text>
              </Section>
            )}

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

const celebrationBox: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 20,
}

const celebrationIcon: React.CSSProperties = { fontSize: 40, margin: '0 0 8px' }

const celebrationText: React.CSSProperties = {
  backgroundColor: '#fef9c3',
  border: '1px solid #fde047',
  borderRadius: 20,
  color: '#713f12',
  display: 'inline-block',
  fontSize: 14,
  fontWeight: 'bold',
  padding: '6px 20px',
  margin: 0,
}

const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }

const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 20px' }

const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }

const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }

const actionBox: React.CSSProperties = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fed7aa',
  borderRadius: 6,
  padding: '16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
