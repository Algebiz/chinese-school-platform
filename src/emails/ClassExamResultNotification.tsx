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

export interface ClassExamResultNotificationProps {
  parentName: string
  studentName: string
  examName: string
  examNameZh: string
  className: string
  examDate: string
  score: number
  maxScore: number
  passed: boolean
  notes?: string
  academicYear: string
}

export function ClassExamResultNotification({
  parentName,
  studentName,
  examName,
  examNameZh,
  className,
  examDate,
  score,
  maxScore,
  passed,
  notes,
  academicYear,
}: ClassExamResultNotificationProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>班级考试成绩通知 / Class Exam Results Available — {studentName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading as="h2" style={h2}>班级考试成绩通知</Heading>
            <Text style={subtitle}>Class Exam Results Available</Text>

            <Text style={p}>尊敬的 {parentName}，</Text>
            <Text style={p}>
              <strong>{studentName}</strong> 的班级考试成绩已出炉！
            </Text>
            <Text style={pEn}>
              Dear {parentName}, the class exam results for <strong>{studentName}</strong> are now available!
            </Text>

            <Section style={resultBox}>
              <Text style={boxTitle}>考试信息 / Exam Details</Text>
              <Row label="考试名称 / Exam" value={`${examNameZh} / ${examName}`} />
              <Row label="班级 / Class" value={className} />
              <Row label="考试日期 / Date" value={examDate} />
              <Row label="成绩 / Score" value={`${score} / ${maxScore}`} />
              <Row
                label="结果 / Result"
                value={passed ? '✅ 通过 / PASSED' : '❌ 未通过 / NOT PASSED'}
                highlight={passed}
              />
              {notes && <Row label="备注 / Notes" value={notes} />}
            </Section>

            <Text style={p}>如有疑问，请联系学校老师或管理人员。</Text>
            <Text style={pEn}>
              If you have any questions, please contact the teacher or school administration.
            </Text>
          </Section>

          <Hr style={hr} />
          <Footer academicYear={academicYear} />
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Section style={{ marginBottom: 8 }}>
      <Text style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</Text>
      <Text style={{ color: highlight === false ? '#dc2626' : highlight ? '#16a34a' : '#374151', fontSize: 14, fontWeight: 'bold', margin: 0 }}>
        {value}
      </Text>
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
const resultBox: React.CSSProperties = {
  backgroundColor: '#f0f9ff',
  borderRadius: 6,
  border: '1px solid #bae6fd',
  padding: '16px 20px',
  margin: '16px 0',
}
const boxTitle: React.CSSProperties = { color: '#0369a1', fontSize: 13, fontWeight: 'bold', margin: '0 0 12px' }
const hr: React.CSSProperties = { borderColor: '#e5e7eb', margin: 0 }
