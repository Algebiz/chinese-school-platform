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

export interface ContactConfirmationProps {
  name: string
  subject: string
  message: string
  academicYear?: string
}

export function ContactConfirmation({
  name,
  subject,
  message,
  academicYear = '2026-2027',
}: ContactConfirmationProps) {
  const preview200 = message.length > 200 ? message.slice(0, 200) + '…' : message

  return (
    <Html lang="zh">
      <Head />
      <Preview>感谢您联系夏洛特中文学校 / Thank you for contacting Charlotte Chinese Academy</Preview>
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
            <Section style={badge}>
              <Text style={badgeText}>✓ 消息已收到 / Message Received</Text>
            </Section>

            <Heading as="h2" style={h2}>亲爱的 {name}，</Heading>
            <Text style={p}>
              感谢您联系夏洛特中文学校！我们已收到您的留言，将在2个工作日内回复您。
            </Text>
            <Text style={pEn}>
              Thank you for contacting Charlotte Chinese Academy! We have received your message and will get back to you within 2 business days.
            </Text>

            <Section style={summaryBox}>
              <Text style={{ ...p, fontWeight: 'bold', margin: '0 0 8px' }}>
                您的留言摘要 / Your Message Summary
              </Text>
              <Text style={{ ...pEn, margin: '0 0 6px' }}>
                <strong>主题 / Subject:</strong> {subject}
              </Text>
              <Text style={{ ...pEn, margin: 0, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                {preview200}
              </Text>
            </Section>

            <Text style={p}>如有紧急问题，请直接发邮件至 info@charlottechineseacademy.org。</Text>
            <Text style={pEn}>
              For urgent matters, please email us directly at info@charlottechineseacademy.org.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer academicYear={academicYear} />
        </Container>
      </Body>
    </Html>
  )
}

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
  color: '#166534', fontSize: 13, fontWeight: 'bold', margin: 0,
}
const h2: React.CSSProperties = { color: '#111827', fontSize: 18, fontWeight: 'bold', margin: '0 0 8px' }
const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }
const pEn: React.CSSProperties = { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: '0 0 4px' }
const summaryBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
