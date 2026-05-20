import {
  Body,
  Button,
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

export interface PasswordResetEmailProps {
  parentName: string
  resetUrl: string
}

export function PasswordResetEmail({ parentName, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>重置您的密码 / Reset your password — XX Chinese School</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={schoolZh}>XX中文学校</Heading>
            <Text style={schoolEn}>XX Chinese School</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={h2}>重置密码</Heading>
            <Text style={subtitle}>Password Reset Request</Text>

            <Text style={p}>您好，{parentName}！</Text>
            <Text style={pEn}>Hello, {parentName}!</Text>

            <Text style={p}>
              我们收到了您的密码重置请求。请点击下方按钮设置新密码。此链接将在 1 小时后失效。
            </Text>
            <Text style={pEn}>
              We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.
            </Text>

            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={resetUrl} style={button}>
                重置密码 / Reset Password
              </Button>
            </Section>

            <Text style={note}>
              如果您没有请求重置密码，请忽略此邮件，您的账号不会受到影响。
            </Text>
            <Text style={{ ...note, color: '#9ca3af' }}>
              If you did not request a password reset, please ignore this email. Your account remains secure.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

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
const header: React.CSSProperties = { backgroundColor: '#dc2626', padding: '28px 32px 20px', textAlign: 'center' }
const schoolZh: React.CSSProperties = { color: '#ffffff', fontSize: 24, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }
const schoolEn: React.CSSProperties = { color: '#fecaca', fontSize: 13, margin: '4px 0 0' }
const content: React.CSSProperties = { padding: '28px 32px' }
const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }
const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 20px' }
const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }
const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }
const button: React.CSSProperties = {
  backgroundColor: '#dc2626',
  borderRadius: 6,
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 'bold',
  padding: '12px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const note: React.CSSProperties = { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
