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
  Code,
  Pre,
} from '@react-email/components';
import { format, formatDistanceToNow } from 'date-fns';

interface SyncFailureEmailProps {
  syncId: string;
  syncType: 'daily' | 'manual' | 'initial';
  error: {
    message: string;
    details?: any;
  };
  failedAt: Date;
  lastSuccessfulSync?: Date;
  adminUrl: string;
  logs?: string[];
}

export const SyncFailureEmail = ({
  syncId,
  syncType,
  error,
  failedAt,
  lastSuccessfulSync,
  adminUrl,
  logs
}: SyncFailureEmailProps) => {
  const timeSinceLastSuccess = lastSuccessfulSync 
    ? formatDistanceToNow(lastSuccessfulSync, { addSuffix: true })
    : 'Never';

  return (
    <Html>
      <Head />
      <Preview>URGENT: Sync failed - Action required</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={alertHeader}>
            <Text style={alertIcon}>⚠️</Text>
            <Heading style={alertH1}>Sync Failed - Action Required</Heading>
          </Section>

          <Text style={text}>
            The {syncType} sync scheduled for {format(failedAt, 'MMM d, yyyy h:mm a')} 
            has failed and requires your attention.
          </Text>

          <Section style={errorSection}>
            <Heading as="h2" style={h2}>Error Details</Heading>
            <Code style={errorCode}>{error.message}</Code>
            
            {error.details && (
              <>
                <Text style={errorLabel}>Additional Information:</Text>
                <Pre style={errorDetails}>{JSON.stringify(error.details, null, 2)}</Pre>
              </>
            )}
          </Section>

          <Section style={infoSection}>
            <Row>
              <Column>
                <Text style={infoLabel}>Sync Type</Text>
                <Text style={infoValue}>{syncType}</Text>
              </Column>
              <Column>
                <Text style={infoLabel}>Failed At</Text>
                <Text style={infoValue}>{format(failedAt, 'h:mm a')}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: '15px' }}>
              <Column>
                <Text style={infoLabel}>Last Successful Sync</Text>
                <Text style={infoValue}>{timeSinceLastSuccess}</Text>
              </Column>
              <Column>
                <Text style={infoLabel}>Sync ID</Text>
                <Text style={infoValue}>{syncId}</Text>
              </Column>
            </Row>
          </Section>

          {logs && logs.length > 0 && (
            <Section style={logsSection}>
              <Heading as="h3" style={h3}>Recent Logs</Heading>
              <Pre style={logsContent}>
                {logs.slice(-10).join('\n')}
              </Pre>
            </Section>
          )}

          <Section style={actionSection}>
            <Heading as="h3" style={h3}>Recommended Actions</Heading>
            <ol style={actionList}>
              <li>Check the Ireland Pay CRM API status</li>
              <li>Verify API credentials are still valid</li>
              <li>Review the error logs for more details</li>
              <li>Manually trigger a sync if the issue is resolved</li>
            </ol>
          </Section>

          <Section style={buttonSection}>
            <Button style={urgentButton} href={adminUrl}>
              Go to Admin Panel
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            This is a critical alert from IrelandPay Analytics. 
            Please address this issue promptly to ensure data accuracy.
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

const alertHeader = {
  backgroundColor: '#fee',
  padding: '20px 32px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
};

const alertIcon = {
  fontSize: '48px',
  margin: '0',
};

const alertH1 = {
  color: '#d32f2f',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '10px 0 0 0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 32px',
};

const errorSection = {
  padding: '20px 32px',
  backgroundColor: '#fef5f5',
  margin: '20px 32px',
  borderRadius: '8px',
  border: '1px solid #ffcccc',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const errorCode = {
  backgroundColor: '#f3f4f6',
  padding: '10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#d32f2f',
  margin: '10px 0',
};

const errorLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '15px 0 5px 0',
};

const errorDetails = {
  backgroundColor: '#f3f4f6',
  padding: '10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#666',
  margin: '5px 0',
  overflow: 'auto',
};

const infoSection = {
  padding: '20px 32px',
  backgroundColor: '#f8f9fa',
  margin: '20px 32px',
  borderRadius: '8px',
};

const infoLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

const infoValue = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '5px 0 0 0',
};

const logsSection = {
  padding: '20px 32px',
  backgroundColor: '#f8f9fa',
  margin: '20px 32px',
  borderRadius: '8px',
};

const logsContent = {
  backgroundColor: '#f3f4f6',
  padding: '10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#666',
  margin: '10px 0',
  overflow: 'auto',
  maxHeight: '200px',
};

const actionSection = {
  padding: '20px 32px',
  backgroundColor: '#f0f9ff',
  margin: '20px 32px',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
};

const actionList = {
  margin: '0',
  paddingLeft: '20px',
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
};

const buttonSection = {
  padding: '32px',
  textAlign: 'center' as const,
};

const urgentButton = {
  backgroundColor: '#d32f2f',
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