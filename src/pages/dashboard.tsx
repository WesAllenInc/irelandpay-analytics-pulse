import { Box, SimpleGrid, Heading } from '@chakra-ui/react';
import ResidualLineChart from '../components/charts/ResidualLineChart';
import SalesCandlestick from '../components/charts/SalesCandlestick';

const Dashboard: React.FC = () => (
  <Box p={6} bg="gray.50" minH="100vh">
    <Heading mb={6}>IrelandPay Analytics Pulse</Heading>
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
      <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
        <ResidualLineChart
          data={[1200, 1450, 1600]}
          categories={['Apr', 'May', 'Jun']}
        />
      </Box>
      <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
        <SalesCandlestick
          seriesData={[
            { x: new Date('2025-05-01'), y: [1000, 1500, 950, 1300] },
            { x: new Date('2025-06-01'), y: [1300, 1700, 1200, 1650] },
          ]}
        />
      </Box>
    </SimpleGrid>
  </Box>
);

export default Dashboard;
