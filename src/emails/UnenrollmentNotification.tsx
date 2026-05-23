import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailHeader, Footer } from './WelcomeEmail'

export interface UnenrollmentNotificationProps {
  parentName: string
  studentName: string
  className: string
  reason: string
  cancelledAt: Date
  academicYear: string
}

export function UnenrollmentNotification({
  parentName,
  studentName,
  className,
  reason,
  cancelledAt,
  academicYear,
}: UnenrollmentNotificationProps) {
  const dateStr = cancelledAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Html lang="zh">
      <Head />
      <Preview>注册取消通知 / Enrollment Cancellation Notice — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Section style={badge}>
              <Text style={badgeText}>📋 注册取消通知 / Enrollment Cancellation Notice</Text>
            </Section>

            <Heading as="h2" style={h2}>尊敬的 {parentName}，</Heading>
            <Text style={p}>
              您的孩子 <strong>{studentName}</strong> 在夏洛特中文学校的{' '}
              <strong>{className}</strong> 注册已被取消。
            </Text>
            <Text style={pEn}>
              Dear {parentName}, this is to confirm that{' '}
              <strong>{studentName}</strong>&apos;s enrollment in{' '}
              <strong>{className}</strong> at Charlotte Chinese Academy has been cancelled.
            </Text>

            <Section style={infoBox}>
              <Text style={{ ...p, margin: '0 0 4px', fontWeight: 'bold' }}>
                取消详情 / Cancellation Details
              </Text>
              <Text style={pInfo}>
                <strong>学生：</strong>{studentName}
              </Text>
              <Text style={pInfo}>
                <strong>班级：</strong>{className}
              </Text>
              <Text style={pInfo}>
                <strong>取消日期：</strong>{dateStr}
              </Text>
              <Text style={pInfo}>
                <strong>原因：</strong>{reason}
              </Text>
            </Section>

            <Section style={refundBox}>
              <Text style={pNote}>
                💡 如有退款相关问题，请联系学校管理员。
              </Text>
              <Text style={{ ...pNote, color: '#92400e' }}>
                For any questions regarding refunds, please contact the school administration at{' '}
                info@charlottechineseacademy.org
              </Text>
            </Section>
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
  backgroundColor: '#fef3c7',
  borderRadius: 20,
  padding: '6px 16px',
  marginBottom: 20,
  display: 'inline-block',
}

const badgeText: React.CSSProperties = {
  color: '#92400e',
  fontSize: 13,
  fontWeight: 'bold',
  margin: 0,
}

const h2: React.CSSProperties = {
  color: '#111827',
  fontSize: 18,
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const p: React.CSSProperties = {
  color: '#374151',
  fontSize: 14,
  lineHeight: 1.6,
  margin: '0 0 6px',
}

const pEn: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.5,
  margin: '0 0 16px',
}

const pInfo: React.CSSProperties = { color: '#374151', fontSize: 13, margin: '0 0 4px' }

const pNote: React.CSSProperties = { color: '#92400e', fontSize: 13, margin: '0 0 4px' }

const infoBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const refundBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '12px 16px',
  margin: '16px 0',
}

const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
