import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { Profile } from '@crew-up/shared'

interface ClaimReminderEmailProps {
  profile: Profile
  claimToken: string
  claimUrl: string
  reminderType: '7day' | '14day'
}

export function ClaimReminderEmail({
  profile,
  claimToken,
  claimUrl,
  reminderType,
}: ClaimReminderEmailProps) {
  const profileUrl = `https://findfilmcrew.com/crew/${profile.slug}`
  const daysText = reminderType === '7day' ? '7 days' : '14 days'
  const reminderMessage =
    reminderType === '7day'
      ? "We noticed you haven't claimed your profile yet. Don't miss out on managing your information and connecting with producers!"
      : "This is a friendly reminder that your profile claim link is still available. Claim your profile to take control of your information!"

  return (
    <Html>
      <Head />
      <Preview>Reminder: Claim your Crew Up profile</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reminder: Claim Your Crew Up Profile</Heading>
          
          <Text style={text}>
            Hello {profile.name},
          </Text>
          
          <Text style={text}>
            {reminderMessage}
          </Text>

          <Text style={text}>
            It's been {daysText} since we sent you your claim invitation. Your profile is waiting for you!
          </Text>

          <Section style={section}>
            <Text style={text}>
              <strong>Your Profile:</strong>
            </Text>
            <Text style={text}>
              <strong>Name:</strong> {profile.name}
            </Text>
            <Text style={text}>
              <strong>Role:</strong> {profile.primary_role}
            </Text>
            <Text style={text}>
              <strong>Location:</strong> {profile.primary_location_city}, {profile.primary_location_state}
            </Text>
            {profile.bio && (
              <Text style={text}>
                <strong>Bio:</strong> {profile.bio}
              </Text>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button href={claimUrl} style={button}>
              Claim Your Profile Now
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>
            <Link href={claimUrl} style={link}>
              {claimUrl}
            </Link>
          </Text>

          <Section style={section}>
            <Heading style={h2}>What does claiming mean?</Heading>
            <Text style={text}>
              When you claim your profile, you'll be able to:
            </Text>
            <Text style={text}>
              • Edit your profile information and photo
            </Text>
            <Text style={text}>
              • Add and manage your credits
            </Text>
            <Text style={text}>
              • Control who can contact you
            </Text>
            <Text style={text}>
              • View analytics about your profile
            </Text>
          </Section>

          <Text style={footer}>
            This claim link will expire in 30 days from when it was originally sent. If you have any questions, please contact us.
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

const section = {
  margin: '24px 0',
  padding: '0',
}

const buttonSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#2754C5',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const link = {
  color: '#2754C5',
  textDecoration: 'underline',
}

const linkText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #e6ebf1',
}

