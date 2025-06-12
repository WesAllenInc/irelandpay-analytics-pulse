import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#f8f9fa',
        color: '#1a202c',
      },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: '10px' },
    },
    Card: {
      baseStyle: {
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
    },
  },
});

export default theme;
