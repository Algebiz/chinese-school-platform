import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Hr,
} from '@react-email/components'
import { Footer } from './WelcomeEmail'

export interface VolunteerRefundProcessedProps {
  parentName: string
  amount: number
  refundNotes?: string | null
  academicYear: string
}

export function VolunteerRefundProcessed({
  parentName,
  amount,
  refundNotes,
  academicYear,
}: VolunteerRefundProcessedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>押金退款已处理 / Volunteer deposit refund processed</Preview>
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
              <Text style={badgeText}>💰 退款已处理 / Refund Processed</Text>
            </Section>

            <Heading as="h2" style={h2}>尊敬的 {parentName}，</Heading>
            <Text style={p}>
              您的志愿服务押金退款已由财务处理完成，款项已发出。
            </Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>退款详情 / Refund Details</Text>
              <Text style={pInfo}>
                <strong>退款金额：</strong>${amount.toFixed(2)}
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
              {refundNotes && (
                <Text style={pInfo}>
                  <strong>备注：</strong>{refundNotes}
                </Text>
              )}
            </Section>

            <Text style={p}>
              感谢您在 {academicYear} 学年对夏洛特中文学校的志愿服务贡献！
            </Text>
            <Text style={pEn}>
              Your volunteer deposit refund of ${amount.toFixed(2)} has been sent. Thank you for
              your volunteer service during the {academicYear} academic year!
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
  backgroundColor: '#16a34a',
  padding: '28px 32px 20px',
  textAlign: 'center',
}

const schoolZh: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 24,
  fontWeight: 'bold',
  margin: 0,
  letterSpacing: '0.05em',
}

const schoolEn: React.CSSProperties = { color: '#bbf7d0', fontSize: 13, margin: '4px 0 0' }

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

const pInfo: React.CSSProperties = { color: '#374151', fontSize: 13, margin: '0 0 4px' }

const infoBox: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
