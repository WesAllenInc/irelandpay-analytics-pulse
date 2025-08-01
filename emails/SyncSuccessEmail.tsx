import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { format } from 'date-fns';

interface SyncSuccessEmailProps {
  syncId: string;
  syncType: 'daily' | 'manual' | 'initial';
  startTime: Date;
  endTime: Date;
  stats: {
    merchantsNew: number;
    merchantsUpdated: number;
    transactionsCount: number;
    residualsCount: number;
    duration: number;
  };
  dashboardUrl: string;
}

export const SyncSuccessEmail = ({
  syncId,
  syncType,
  startTime,
  endTime,
  stats,
  dashboardUrl
}: SyncSuccessEmailProps) => {
  const formattedStartTime = format(startTime, 'MMM d, yyyy h:mm a');
  const durationMinutes = Math.round(stats.duration / 60000);

  return (
    <Html>
      <Head />
      <Preview>Sync completed successfully - {formattedStartTime}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://irelandpay.com/logo.png"
              width="150"
              height="50"
              alt="IrelandPay Analytics"
            />
          </Section>

          <Heading style={h1}>Sync Completed Successfully ✅</Heading>
          
          <Text style={text}>
            Your {syncType} sync has completed successfully on {formattedStartTime}.
          </Text>

          <Section style={statsSection}>
            <Heading as="h2" style={h2}>Sync Summary</Heading>
            
            <Row>
              <Column style={statColumn}>
                <Text style={statLabel}>New Merchants</Text>
                <Text style={statValue}>{stats.merchantsNew}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Updated Merchants</Text>
                <Text style={statValue}>{stats.merchantsUpdated}</Text>
              </Column>
            </Row>
            
            <Row style={{ marginTop: '20px' }}>
              <Column style={statColumn}>
                <Text style={statLabel}>Transactions</Text>
                <Text style={statValue}>{stats.transactionsCount.toLocaleString()}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Residuals</Text>
                <Text style={statValue}>{stats.residualsCount.toLocaleString()}</Text>
              </Column>
            </Row>
            
            <Hr style={hr} />
            
            <Row>
              <Column>
                <Text style={detailText}>
                  <strong>Duration:</strong> {durationMinutes} minutes
                </Text>
                <Text style={detailText}>
                  <strong>Sync ID:</strong> {syncId}
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              View Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            This is an automated notification from IrelandPay Analytics.
            You're receiving this because you're the system administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 32px 0',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0 32px',
  margin: '30px 0',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 32px',
};

const statsSection = {
  padding: '32px',
  backgroundColor: '#f8f9fa',
  margin: '20px 32px',
  borderRadius: '8px',
};

const statColumn = {
  width: '50%',
  paddingRight: '10px',
};

const statLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

const statValue = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '5px 0 0 0',
};

const detailText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '5px 0',
};

const buttonSection = {
  padding: '32px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 32px',
}; 