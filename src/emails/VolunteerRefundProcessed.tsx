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
  refundMethod: 'stripe' | 'paypal'
  refundId: string
  academicYear: string
}

export function VolunteerRefundProcessed({
  parentName,
  amount,
  refundMethod,
  refundId,
  academicYear,
}: VolunteerRefundProcessedProps) {
  const isStripe = refundMethod === 'stripe'
  const timelineZh = isStripe
    ? '退款将在 5-10 个工作日内退回您的信用卡'
    : '退款将在 3-5 个工作日内退回您的 PayPal 账户'
  const timelineEn = isStripe
    ? 'Refund will appear on your credit card within 5-10 business days'
    : 'Refund will appear in your PayPal account within 3-5 business days'

  return (
    <Html lang="zh">
      <Head />
      <Preview>押金退款已自动处理 / Volunteer deposit refund processed automatically</Preview>
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
              您的 $100 押金退款已自动处理完成。
            </Text>
            <Text style={pEn}>
              Your $100 deposit refund has been automatically processed.
            </Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>退款详情 / Refund Details</Text>
              <Text style={pInfo}>
                <strong>退款金额：</strong>${amount.toFixed(2)}
              </Text>
              <Text style={pInfo}>
                <strong>学年：</strong>{academicYear}
              </Text>
              <Text style={pInfo}>
                <strong>到账时间：</strong>{timelineZh}
              </Text>
              <Text style={{ ...pInfo, color: '#6b7280', fontSize: 12 }}>
                {timelineEn}
              </Text>
              <Text style={pInfo}>
                <strong>退款参考编号：</strong>{refundId}
              </Text>
            </Section>

            <Text style={p}>
              感谢您在 {academicYear} 学年对夏洛特中文学校的志愿服务贡献！
            </Text>
            <Text style={pEn}>
              Thank you for your volunteer service during the {academicYear} academic year!
            </Text>
            <Text style={pNote}>
              如有疑问请联系 info@charlottechineseacademy.org
              <br />
              Questions? Contact info@charlottechineseacademy.org
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

const pEn: React.CSSProperties = { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }

const pInfo: React.CSSProperties = { color: '#374151', fontSize: 13, margin: '0 0 4px' }

const pNote: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }

const infoBox: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
