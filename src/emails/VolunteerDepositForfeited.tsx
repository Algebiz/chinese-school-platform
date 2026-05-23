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

export interface VolunteerDepositForfeitedProps {
  parentName: string
  amount: number
  academicYear: string
  reason?: string | null
}

export function VolunteerDepositForfeited({
  parentName,
  amount,
  academicYear,
  reason,
}: VolunteerDepositForfeitedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>志愿服务押金已没收 / Volunteer deposit forfeited</Preview>
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
            <Heading as="h2" style={h2}>尊敬的 {parentName}，</Heading>
            <Text style={p}>
              我们遗憾地通知您，您在 {academicYear} 学年缴纳的志愿服务押金已被没收。
            </Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>押金详情 / Deposit Details</Text>
              <Text style={pInfo}>
                <strong>金额：</strong>${amount.toFixed(2)}
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
              {reason && (
                <Text style={pInfo}>
                  <strong>原因：</strong>{reason}
                </Text>
              )}
            </Section>

            <Text style={p}>
              如有疑问，请联系学校招生处。
            </Text>
            <Text style={pEn}>
              We regret to inform you that your volunteer deposit of ${amount.toFixed(2)} for the{' '}
              {academicYear} academic year has been forfeited. If you have any questions, please
              contact our admissions office.
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
  backgroundColor: '#6b7280',
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

const schoolEn: React.CSSProperties = { color: '#e5e7eb', fontSize: 13, margin: '4px 0 0' }

const content: React.CSSProperties = { padding: '28px 32px' }

const h2: React.CSSProperties = { color: '#111827', fontSize: 18, fontWeight: 'bold', margin: '0 0 8px' }

const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }

const pEn: React.CSSProperties = { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: '0 0 4px' }

const pInfo: React.CSSProperties = { color: '#374151', fontSize: 13, margin: '0 0 4px' }

const infoBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
