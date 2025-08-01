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
  Table,
  Td,
  Th,
  Tr,
} from '@react-email/components';
import { format } from 'date-fns';

interface SyncSummary {
  id: string;
  type: 'daily' | 'manual' | 'initial';
  status: 'success' | 'failure' | 'partial';
  startTime: Date;
  endTime: Date;
  merchantsNew: number;
  merchantsUpdated: number;
  transactionsCount: number;
  residualsCount: number;
  duration: number;
  error?: string;
}

interface DailySummaryEmailProps {
  date: Date;
  syncs: SyncSummary[];
  totalMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  issues: string[];
  dashboardUrl: string;
}

export const DailySummaryEmail = ({
  date,
  syncs,
  totalMerchants,
  totalTransactions,
  totalVolume,
  issues,
  dashboardUrl
}: DailySummaryEmailProps) => {
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const successfulSyncs = syncs.filter(s => s.status === 'success').length;
  const failedSyncs = syncs.filter(s => s.status === 'failure').length;
  const totalDuration = syncs.reduce((sum, sync) => sum + sync.duration, 0);

  return (
    <Html>
      <Head />
      <Preview>Daily Summary - {formattedDate}</Preview>
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

          <Heading style={h1}>Daily Summary Report</Heading>
          <Text style={subtitle}>{formattedDate}</Text>

          <Section style={overviewSection}>
            <Heading as="h2" style={h2}>Daily Overview</Heading>
            
            <Row>
              <Column style={statColumn}>
                <Text style={statLabel}>Total Syncs</Text>
                <Text style={statValue}>{syncs.length}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Successful</Text>
                <Text style={successValue}>{successfulSyncs}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Failed</Text>
                <Text style={failedValue}>{failedSyncs}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Total Duration</Text>
                <Text style={statValue}>{Math.round(totalDuration / 60000)}m</Text>
              </Column>
            </Row>
          </Section>

          <Section style={dataSection}>
            <Heading as="h2" style={h2}>Data Summary</Heading>
            
            <Row>
              <Column style={statColumn}>
                <Text style={statLabel}>Total Merchants</Text>
                <Text style={statValue}>{totalMerchants.toLocaleString()}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Total Transactions</Text>
                <Text style={statValue}>{totalTransactions.toLocaleString()}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Total Volume</Text>
                <Text style={statValue}>€{totalVolume.toLocaleString()}</Text>
              </Column>
            </Row>
          </Section>

          {syncs.length > 0 && (
            <Section style={syncsSection}>
              <Heading as="h2" style={h2}>Sync Details</Heading>
              
              <Table style={table}>
                <Tr style={tableHeader}>
                  <Th style={th}>Time</Th>
                  <Th style={th}>Type</Th>
                  <Th style={th}>Status</Th>
                  <Th style={th}>Merchants</Th>
                  <Th style={th}>Transactions</Th>
                  <Th style={th}>Duration</Th>
                </Tr>
                {syncs.map((sync) => (
                  <Tr key={sync.id} style={tableRow}>
                    <Td style={td}>{format(sync.startTime, 'h:mm a')}</Td>
                    <Td style={td}>{sync.type}</Td>
                    <Td style={td}>
                      <Text style={getStatusStyle(sync.status)}>
                        {sync.status}
                      </Text>
                    </Td>
                    <Td style={td}>
                      {sync.merchantsNew + sync.merchantsUpdated}
                    </Td>
                    <Td style={td}>
                      {sync.transactionsCount.toLocaleString()}
                    </Td>
                    <Td style={td}>
                      {Math.round(sync.duration / 60000)}m
                    </Td>
                  </Tr>
                ))}
              </Table>
            </Section>
          )}

          {issues.length > 0 && (
            <Section style={issuesSection}>
              <Heading as="h2" style={h2}>Issues & Warnings</Heading>
              <ul style={issuesList}>
                {issues.map((issue, index) => (
                  <li key={index} style={issueItem}>{issue}</li>
                ))}
              </ul>
            </Section>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              View Full Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            This is an automated daily summary from IrelandPay Analytics.
            You're receiving this because you're the system administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'success':
      return { color: '#059669', fontWeight: 'bold' };
    case 'failure':
      return { color: '#dc2626', fontWeight: 'bold' };
    case 'partial':
      return { color: '#d97706', fontWeight: 'bold' };
    default:
      return { color: '#666', fontWeight: 'bold' };
  }
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
  margin: '30px 0 10px 0',
};

const subtitle = {
  color: '#666',
  fontSize: '16px',
  padding: '0 32px',
  margin: '0 0 30px 0',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 15px',
};

const overviewSection = {
  padding: '32px',
  backgroundColor: '#f8f9fa',
  margin: '20px 32px',
  borderRadius: '8px',
};

const dataSection = {
  padding: '32px',
  backgroundColor: '#f0f9ff',
  margin: '20px 32px',
  borderRadius: '8px',
};

const syncsSection = {
  padding: '32px',
  backgroundColor: '#ffffff',
  margin: '20px 32px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const issuesSection = {
  padding: '32px',
  backgroundColor: '#fef3c7',
  margin: '20px 32px',
  borderRadius: '8px',
  border: '1px solid #f59e0b',
};

const statColumn = {
  width: '25%',
  paddingRight: '10px',
};

const statLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

const statValue = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '5px 0 0 0',
};

const successValue = {
  color: '#059669',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '5px 0 0 0',
};

const failedValue = {
  color: '#dc2626',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '5px 0 0 0',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tableHeader = {
  backgroundColor: '#f8f9fa',
};

const th = {
  padding: '12px',
  textAlign: 'left' as const,
  borderBottom: '1px solid #e2e8f0',
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333',
};

const tableRow = {
  borderBottom: '1px solid #f1f5f9',
};

const td = {
  padding: '12px',
  fontSize: '14px',
  color: '#333',
};

const issuesList = {
  margin: '0',
  paddingLeft: '20px',
};

const issueItem = {
  color: '#92400e',
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