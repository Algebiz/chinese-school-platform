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

export interface VolunteerClaimRejectedProps {
  parentName: string
  serviceName: string
  serviceNameZh: string
  rejectionReason: string
  academicYear: string
}

export function VolunteerClaimRejected({
  parentName,
  serviceName,
  serviceNameZh,
  rejectionReason,
  academicYear,
}: VolunteerClaimRejectedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>志愿服务申请未通过 / Volunteer claim not approved</Preview>
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
              我们已审核您提交的志愿服务申请，遗憾地通知您此次申请未能通过审核。
            </Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>申请详情 / Claim Details</Text>
              <Text style={pInfo}>
                <strong>服务项目：</strong>{serviceNameZh} ({serviceName})
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
            </Section>

            <Section style={reasonBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold', color: '#92400e' }}>
                未通过原因 / Rejection Reason
              </Text>
              <Text style={{ ...p, margin: 0, color: '#92400e' }}>{rejectionReason}</Text>
            </Section>

            <Text style={p}>
              如果您认为此决定有误，或希望重新提交申请，请登录系统重新提交，或联系招生处。
            </Text>
            <Text style={pEn}>
              If you believe this decision is in error or would like to resubmit your claim, please
              log in to the portal and submit a new claim, or contact our admissions office.
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
  color: '#ffffff',
  fontSize: 24,
  fontWeight: 'bold',
  margin: 0,
  letterSpacing: '0.05em',
}

const schoolEn: React.CSSProperties = { color: '#fecaca', fontSize: 13, margin: '4px 0 0' }

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

const reasonBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
