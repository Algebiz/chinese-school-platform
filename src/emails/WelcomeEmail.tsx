import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  parentName: string
}

export function WelcomeEmail({ parentName }: WelcomeEmailProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>欢迎加入夏洛特中文学校 / Welcome to Charlotte Chinese Academy</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>欢迎，{parentName}！</Heading>
            <Text style={subtitle}>Welcome, {parentName}!</Text>

            <Text style={p}>
              感谢您注册夏洛特中文学校家长账号。请按照以下步骤为您的孩子完成报名：
            </Text>
            <Text style={pEn}>
              Thank you for creating your account with Charlotte Chinese Academy. Follow the steps below to enroll your children:
            </Text>

            <Section style={steps}>
              <Step n="1" zh="登录您的账号" en="Log in at our website" />
              <Step n="2" zh='在"班级浏览"中选择中文班（必选）和才艺班（可选）' en="Browse and select Chinese class (required) and arts classes (optional)" />
              <Step n="3" zh="确认报名信息并完成支付" en="Confirm your selections and complete payment" />
              <Step n="4" zh="收到确认邮件即报名成功" en="Receive confirmation email — enrollment complete!" />
            </Section>

            <Text style={p}>
              如有任何问题，请随时联系我们的招生处。
            </Text>
            <Text style={pEn}>
              If you have any questions, please don't hesitate to reach out to our admissions office.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

function Step({ n, zh, en }: { n: string; zh: string; en: string }) {
  return (
    <Section style={{ marginBottom: 12 }}>
      <Text style={{ ...p, margin: 0 }}>
        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{n}.</span> {zh}
      </Text>
      <Text style={{ ...pEn, margin: 0, paddingLeft: 16 }}>{en}</Text>
    </Section>
  )
}

export function EmailHeader() {
  return (
    <Section style={{ backgroundColor: '#CC0000', padding: '12px 24px' }}>
      <Row>
        <Column style={{ width: '48px', verticalAlign: 'middle' }}>
          <Img
            src="https://chinese-school-platform.vercel.app/logo.png"
            alt="CCA Logo"
            width="40"
            height="40"
            style={{ borderRadius: '50%', backgroundColor: 'white', padding: '2px', display: 'block' }}
          />
        </Column>
        <Column style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
          <Text style={{ fontSize: '15px', fontWeight: '500', color: 'white', margin: '0', lineHeight: '1.2' }}>
            夏洛特中文学校
          </Text>
          <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0', lineHeight: '1.2' }}>
            Charlotte Chinese Academy
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

export function Footer({ academicYear = '2026-2027' }: { academicYear?: string } = {}) {
  return (
    <Section style={footer}>
      <Text style={footerText}>夏洛特中文学校 / Charlotte Chinese Academy</Text>
      <Text style={footerText}>info@school.com · (XXX) XXX-XXXX</Text>
      <Text style={{ ...footerText, color: '#9ca3af', fontSize: 11 }}>
        {academicYear} 学年 / Academic Year
      </Text>
    </Section>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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

const h2: React.CSSProperties = {
  color: '#111827',
  fontSize: 20,
  fontWeight: 'bold',
  margin: '0 0 2px',
}

const subtitle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 13,
  margin: '0 0 20px',
}

const p: React.CSSProperties = {
  color: '#374151',
  fontSize: 14,
  lineHeight: 1.6,
  margin: '0 0 6px',
}

const pEn: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: 12,
  lineHeight: 1.5,
  margin: '0 0 16px',
}

const steps: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  padding: '16px 20px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }

const footer: React.CSSProperties = { padding: '16px 32px', textAlign: 'center' }

const footerText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  margin: '2px 0',
}
