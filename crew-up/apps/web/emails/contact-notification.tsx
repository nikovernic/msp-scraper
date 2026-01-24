import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ContactNotificationEmailProps {
  profileName: string
  profileSlug: string
  producerName: string
  producerEmail: string
  producerPhone?: string | null
  message: string
  shootDates?: string | null
}

export function ContactNotificationEmail({
  profileName,
  profileSlug,
  producerName,
  producerEmail,
  producerPhone,
  message,
  shootDates,
}: ContactNotificationEmailProps) {
  const profileUrl = `https://findfilmcrew.com/crew/${profileSlug}`

  return (
    <Html>
      <Head />
      <Preview>New contact inquiry from {producerName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Contact Inquiry</Heading>
          
          <Text style={text}>
            Hello {profileName},
          </Text>
          
          <Text style={text}>
            You have received a new contact inquiry through your Crew Up profile.
          </Text>

          <Section style={section}>
            <Heading style={h2}>Producer Information</Heading>
            <Text style={text}>
              <strong>Name:</strong> {producerName}
            </Text>
            <Text style={text}>
              <strong>Email:</strong>{' '}
              <Link href={`mailto:${producerEmail}`} style={link}>
                {producerEmail}
              </Link>
            </Text>
            {producerPhone && (
              <Text style={text}>
                <strong>Phone:</strong>{' '}
                <Link href={`tel:${producerPhone}`} style={link}>
                  {producerPhone}
                </Link>
              </Text>
            )}
          </Section>

          <Section style={section}>
            <Heading style={h2}>Message</Heading>
            <Text style={messageText}>{message}</Text>
          </Section>

          {shootDates && (
            <Section style={section}>
              <Heading style={h2}>Shoot Dates</Heading>
              <Text style={text}>{shootDates}</Text>
            </Section>
          )}

          <Section style={section}>
            <Text style={text}>
              <Link href={profileUrl} style={link}>
                View your profile on Crew Up
              </Link>
            </Text>
          </Section>

          <Text style={footer}>
            This email was sent from Crew Up. Please reply directly to{' '}
            <Link href={`mailto:${producerEmail}`} style={link}>
              {producerEmail}
            </Link>
            {' '}to respond to this inquiry.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Email styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
}

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 12px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 12px',
}

const messageText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0',
  whiteSpace: 'pre-wrap',
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '4px',
}

const section = {
  margin: '24px 0',
  padding: '0',
}

const link = {
  color: '#2754C5',
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #e6ebf1',
}

