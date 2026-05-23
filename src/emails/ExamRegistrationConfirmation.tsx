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
import { EmailHeader, Footer } from './WelcomeEmail'

export interface ExamRegistrationConfirmationProps {
  parentName: string
  studentName: string
  examType: string
  level: number
  examDate: string
  location: string
  locationZh: string
  fee: string
  registrationId: string
  academicYear: string
}

export function ExamRegistrationConfirmation({
  parentName,
  studentName,
  examType,
  level,
  examDate,
  location,
  locationZh,
  fee,
  registrationId,
  academicYear,
}: ExamRegistrationConfirmationProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>考试报名收到，等待审核 / Exam registration received, pending review</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>考试报名已收到 / Registration Received</Heading>
            <Text style={subtitle}>亲爱的 {parentName}，</Text>

            <Text style={p}>
              我们已收到 <strong>{studentName}</strong> 参加 <strong>{examType} Level {level}</strong> 考试的报名及付款。您的报名正在等待学校审核，审核完成后我们将发送确认邮件。
            </Text>
            <Text style={pEn}>
              We have received the exam registration and payment for <strong>{studentName}</strong> for <strong>{examType} Level {level}</strong>. Your registration is pending school review — you will receive a confirmation email once approved.
            </Text>

            <Section style={infoBox}>
              <Row label="学生 / Student" value={studentName} />
              <Row label="考试 / Exam" value={`${examType} Level ${level}`} />
              <Row label="考试日期 / Date" value={examDate} />
              <Row label="考场 / Location" value={`${locationZh} / ${location}`} />
              <Row label="费用 / Fee" value={`$${fee}`} />
              <Row label="报名号 / Registration ID" value={registrationId.slice(-8).toUpperCase()} />
            </Section>

            <Text style={p}>
              如有疑问，请联系学校招生处，并注明报名号。
            </Text>
            <Text style={pEn}>
              If you have questions, please contact the school with your registration ID.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer academicYear={academicYear} />
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ marginBottom: 6 }}>
      <Text style={{ ...p, margin: 0, color: '#6b7280', fontSize: 12 }}>{label}</Text>
      <Text style={{ ...p, margin: 0, fontWeight: 'bold' }}>{value}</Text>
    </Section>
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
const content: React.CSSProperties = { padding: '28px 32px' }
const h2: React.CSSProperties = { color: '#111827', fontSize: 20, fontWeight: 'bold', margin: '0 0 2px' }
const subtitle: React.CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 16px' }
const p: React.CSSProperties = { color: '#374151', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }
const pEn: React.CSSProperties = { color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px' }
const infoBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  padding: '16px 20px',
  margin: '16px 0',
}
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
