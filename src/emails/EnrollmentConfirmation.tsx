import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Img,
  Text,
} from '@react-email/components'
import { Footer } from './WelcomeEmail'

export interface EnrollmentConfirmationProps {
  parentName: string
  studentName: string
  classes: {
    name: string
    teacher?: string | null
    schedule?: string
    fee: string
  }[]
  textbooks?: {
    name: string
    nameZh: string
    price: string
  }[]
  total: string
  paymentMethod: 'STRIPE' | 'PAYPAL'
  transactionId: string
  academicYear: string
}

export function EnrollmentConfirmation({
  parentName,
  studentName,
  classes,
  textbooks = [],
  total,
  paymentMethod,
  transactionId,
  academicYear,
}: EnrollmentConfirmationProps) {
  const methodLabel = paymentMethod === 'STRIPE' ? '信用卡 / Credit Card' : 'PayPal'

  return (
    <Html lang="zh">
      <Head />
      <Preview>报名成功 — {studentName} / Enrollment Confirmed — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
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
            {/* Badge */}
            <Section style={badge}>
              <Text style={badgeText}>✓ 报名成功 / Enrollment Confirmed</Text>
            </Section>

            <Heading as="h2" style={h2}>亲爱的 {parentName}，</Heading>
            <Text style={p}>
              <strong>{studentName}</strong> 已成功报名以下班级，期待在课堂上见到您的孩子！
            </Text>
            <Text style={pEn}>
              <strong>{studentName}</strong> has been successfully enrolled in the following classes. We look forward to seeing your child!
            </Text>

            {/* Class table */}
            <Section style={tableWrap}>
              <Row style={tableHead}>
                <Column style={{ ...cell, fontWeight: 'bold', color: '#374151', width: '55%' }}>班级 / Class</Column>
                <Column style={{ ...cell, fontWeight: 'bold', color: '#374151', width: '25%' }}>时间 / Schedule</Column>
                <Column style={{ ...cell, fontWeight: 'bold', color: '#374151', width: '20%', textAlign: 'right' }}>费用 / Fee</Column>
              </Row>
              {classes.map((cls, i) => (
                <Row key={i} style={i % 2 === 0 ? rowEven : rowOdd}>
                  <Column style={cell}>
                    <Text style={{ ...p, margin: 0 }}>{cls.name}</Text>
                    {cls.teacher && (
                      <Text style={{ ...pEn, margin: 0 }}>老师：{cls.teacher}</Text>
                    )}
                  </Column>
                  <Column style={cell}>
                    <Text style={{ ...pEn, margin: 0 }}>{cls.schedule ?? '—'}</Text>
                  </Column>
                  <Column style={{ ...cell, textAlign: 'right' }}>
                    <Text style={{ ...p, margin: 0 }}>${parseFloat(cls.fee).toFixed(2)}</Text>
                  </Column>
                </Row>
              ))}
              {/* Total row */}
              <Row style={totalRow}>
                <Column style={{ ...cell, fontWeight: 'bold' }}>合计 / Total</Column>
                <Column style={cell} />
                <Column style={{ ...cell, textAlign: 'right', color: '#dc2626', fontWeight: 'bold', fontSize: 16 }}>
                  ${parseFloat(total).toFixed(2)}
                </Column>
              </Row>
            </Section>

            {/* Textbooks section */}
            {textbooks.length > 0 && (
              <Section style={textbookBox}>
                <Text style={{ ...p, margin: '0 0 8px', fontWeight: 'bold' }}>
                  教材订购 / Textbooks Ordered
                </Text>
                {textbooks.map((tb, i) => (
                  <Row key={i}>
                    <Column style={{ ...cell, paddingTop: 4, paddingBottom: 4 }}>
                      <Text style={{ ...pEn, margin: 0 }}>
                        {tb.name} / {tb.nameZh} — ${parseFloat(tb.price).toFixed(2)}
                      </Text>
                    </Column>
                  </Row>
                ))}
                <Text style={{ ...pEn, margin: '8px 0 0', color: '#92400e' }}>
                  请在上课当日到校领取教材。/ Please pick up your textbooks at school on class day.
                </Text>
              </Section>
            )}

            {/* Payment info */}
            <Section style={paymentBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>支付信息 / Payment Details</Text>
              <Text style={{ ...pEn, margin: 0 }}>
                方式 / Method: {methodLabel}
              </Text>
              <Text style={{ ...pEn, margin: 0 }}>
                交易号 / Transaction ID: {transactionId}
              </Text>
            </Section>

            <Text style={p}>如有问题请联系招生处。感谢您的支持！</Text>
            <Text style={pEn}>Please contact our admissions office if you have any questions. Thank you for your support!</Text>
          </Section>

          <Hr style={hr} />
          <Footer academicYear={academicYear} />
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

const badge: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  borderRadius: 20,
  padding: '6px 16px',
  marginBottom: 20,
  display: 'inline-block',
}

const badgeText: React.CSSProperties = {
  color: '#166534',
  fontSize: 13,
  fontWeight: 'bold',
  margin: 0,
}

const h2: React.CSSProperties = { color: '#111827', fontSize: 18, fontWeight: 'bold', margin: '0 0 8px' }

const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }

const pEn: React.CSSProperties = { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: '0 0 4px' }

const tableWrap: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  overflow: 'hidden',
  margin: '16px 0',
}

const tableHead: React.CSSProperties = { backgroundColor: '#f3f4f6' }

const rowEven: React.CSSProperties = { backgroundColor: '#ffffff' }

const rowOdd: React.CSSProperties = { backgroundColor: '#f9fafb' }

const totalRow: React.CSSProperties = { backgroundColor: '#fef2f2', borderTop: '2px solid #fca5a5' }

const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, verticalAlign: 'top' }

const textbookBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const paymentBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
