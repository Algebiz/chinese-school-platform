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

export interface ExamRegistrationRejectedProps {
  parentName: string
  studentName: string
  examType: string
  level: number
  examDate: string
  rejectionReason: string
  registrationId: string
  academicYear: string
}

export function ExamRegistrationRejected({
  parentName,
  studentName,
  examType,
  level,
  examDate,
  rejectionReason,
  registrationId,
  academicYear,
}: ExamRegistrationRejectedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>关于考试报名的通知 / Notice regarding your exam registration</Preview>
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
            <Heading as="h2" style={h2}>考试报名通知</Heading>
            <Text style={subtitle}>Exam Registration Notice</Text>

            <Text style={p}>
              亲爱的 {parentName}，
            </Text>
            <Text style={p}>
              很遗憾，<strong>{studentName}</strong> 参加 <strong>{examType} Level {level}（{examDate}）</strong> 考试的报名未能通过审核。
            </Text>
            <Text style={pEn}>
              We regret to inform you that the exam registration for <strong>{studentName}</strong> for <strong>{examType} Level {level} ({examDate})</strong> was not approved.
            </Text>

            <Section style={reasonBox}>
              <Text style={{ color: '#92400e', fontSize: 12, margin: '0 0 4px', fontWeight: 'bold' }}>
                原因 / Reason:
              </Text>
              <Text style={{ color: '#78350f', fontSize: 14, margin: 0 }}>
                {rejectionReason}
              </Text>
            </Section>

            <Text style={{ color: '#6b7280', fontSize: 12, margin: '0 0 4px' }}>
              报名号 / Registration ID: {registrationId.slice(-8).toUpperCase()}
            </Text>

            <Text style={p}>
              如有疑问或需要退款说明，请联系学校招生处。
            </Text>
            <Text style={pEn}>
              If you have questions or need information about refunds, please contact the school admissions office.
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
const header: React.CSSProperties = {
  backgroundColor: '#dc2626',
  padding: '28px 32px 20px',
  textAlign: 'center',
}
const schoolZh: React.CSSProperties = { color: '#ffffff', fontSize: 24, fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }
const schoolEn: React.CSSProperties = { color: '#fecaca', fontSize: 13, margin: '4px 0 0' }
const content: React.CSSProperties = { padding: '28px 32px' }
const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }
const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 16px' }
const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }
const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }
const reasonBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderRadius: 6,
  border: '1px solid #fde68a',
  padding: '12px 16px',
  margin: '16px 0',
}
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
