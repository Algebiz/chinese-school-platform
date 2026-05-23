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

export interface VolunteerClaimApprovedProps {
  parentName: string
  serviceName: string
  serviceNameZh: string
  academicYear: string
}

export function VolunteerClaimApproved({
  parentName,
  serviceName,
  serviceNameZh,
  academicYear,
}: VolunteerClaimApprovedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>志愿服务已确认！/ Volunteer service confirmed!</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Section style={badge}>
              <Text style={badgeText}>✓ 志愿服务已确认 / Service Approved</Text>
            </Section>

            <Heading as="h2" style={h2}>恭喜，{parentName}！</Heading>
            <Text style={p}>您的志愿服务已确认！感谢您对夏洛特中文学校的贡献。</Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>服务详情 / Service Details</Text>
              <Text style={pInfo}>
                <strong>服务项目：</strong>{serviceNameZh} ({serviceName})
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
            </Section>

            <Text style={p}>
              押金将由财务处理退款，请耐心等待。退款完成后我们会另行通知您。
            </Text>
            <Text style={pEn}>
              Your volunteer service has been confirmed! The refund will be processed by our
              accountant. You will receive another notification once the refund has been sent.
              Thank you for your dedication to our school!
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
