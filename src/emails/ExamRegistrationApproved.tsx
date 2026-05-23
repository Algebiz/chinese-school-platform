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

export interface ExamRegistrationApprovedProps {
  parentName: string
  studentName: string
  examType: string
  level: number
  examDate: string
  location: string
  locationZh: string
  registrationId: string
  academicYear: string
}

export function ExamRegistrationApproved({
  parentName,
  studentName,
  examType,
  level,
  examDate,
  location,
  locationZh,
  registrationId,
  academicYear,
}: ExamRegistrationApprovedProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>考试报名已确认！/ Exam registration confirmed!</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>考试报名已确认 ✓</Heading>
            <Text style={subtitle}>Exam Registration Confirmed</Text>

            <Text style={p}>
              亲爱的 {parentName}，
            </Text>
            <Text style={p}>
              恭喜！<strong>{studentName}</strong> 参加 <strong>{examType} Level {level}</strong> 考试的报名已经由学校正式确认。
            </Text>
            <Text style={pEn}>
              Congratulations! The exam registration for <strong>{studentName}</strong> for <strong>{examType} Level {level}</strong> has been officially confirmed by the school.
            </Text>

            <Section style={infoBox}>
              <Row label="学生 / Student" value={studentName} />
              <Row label="考试 / Exam" value={`${examType} Level ${level}`} />
              <Row label="考试日期 / Date" value={examDate} />
              <Row label="考场 / Location" value={`${locationZh} / ${location}`} />
              <Row label="报名号 / Registration ID" value={registrationId.slice(-8).toUpperCase()} />
            </Section>

            <Text style={p}>
              请提醒学生按时到达考场。如需更多信息，请联系学校招生处。
            </Text>
            <Text style={pEn}>
              Please remind your student to arrive on time. For more information, contact the school admissions office.
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
      <Text style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</Text>
      <Text style={{ color: '#374151', fontSize: 14, fontWeight: 'bold', margin: 0 }}>{value}</Text>
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
  backgroundColor: '#f0fdf4',
  borderRadius: 6,
  border: '1px solid #bbf7d0',
  padding: '16px 20px',
  margin: '16px 0',
}
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
