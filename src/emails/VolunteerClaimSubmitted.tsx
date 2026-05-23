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
import { EmailHeader, Footer } from './WelcomeEmail'

export interface VolunteerClaimSubmittedProps {
  parentName: string
  serviceName: string
  serviceNameZh: string
  academicYear: string
}

export function VolunteerClaimSubmitted({
  parentName,
  serviceName,
  serviceNameZh,
  academicYear,
}: VolunteerClaimSubmittedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>志愿服务申请已收到 / Volunteer claim received</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Section style={badge}>
              <Text style={badgeText}>📋 申请已收到 / Claim Received</Text>
            </Section>

            <Heading as="h2" style={h2}>亲爱的 {parentName}，</Heading>
            <Text style={p}>您的志愿服务申请已收到，正在审核中。</Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>申请详情 / Claim Details</Text>
              <Text style={pInfo}>
                <strong>服务项目：</strong>{serviceNameZh} ({serviceName})
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
            </Section>

            <Text style={p}>审核通过后，我们将通知您押金退款进度。感谢您对学校的支持！</Text>
            <Text style={pEn}>
              Your volunteer claim has been received and is under review. We will notify you once it
              is approved. Thank you for supporting our school!
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


const content: React.CSSProperties = { padding: '28px 32px' }

const badge: React.CSSProperties = {
  backgroundColor: '#dbeafe',
  borderRadius: 20,
  padding: '6px 16px',
  marginBottom: 20,
  display: 'inline-block',
}

const badgeText: React.CSSProperties = {
  color: '#1e40af',
  fontSize: 13,
  fontWeight: 'bold',
  margin: 0,
}

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
