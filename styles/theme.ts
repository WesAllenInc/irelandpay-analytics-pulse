// Theme configuration for shadcn/ui

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f2ff',
      100: '#cce5ff',
      200: '#99caff',
      300: '#66afff',
      400: '#3394ff',
      500: '#0078ff', // Primary brand color
      600: '#0065d9',
      700: '#0052b3',
      800: '#003e8c',
      900: '#002a66',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: {
      500: '#10b981',
    },
    warning: {
      500: '#f59e0b',
    },
    danger: {
      500: '#ef4444',
    },
    info: {
      500: '#3b82f6',
    },
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: '#f9fafb',
        color: '#1f2937',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
        borderRadius: '0.5rem',
      },
      variants: {
        solid: (props: any) => ({
          bg: props.colorScheme === 'gray' ? 'gray.100' : `${props.colorScheme}.500`,
          color: props.colorScheme === 'gray' ? 'gray.800' : 'white',
          _hover: {
            bg: props.colorScheme === 'gray' ? 'gray.200' : `${props.colorScheme}.600`,
          },
        }),
        outline: (props: any) => ({
          borderColor: `${props.colorScheme}.500`,
          color: `${props.colorScheme}.500`,
        }),
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '0.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          bg: 'white',
          overflow: 'hidden',
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: '0.5rem',
        },
      },
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _hover: {
              borderColor: 'gray.400',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '600',
      },
    },
  },
});

export default theme;
