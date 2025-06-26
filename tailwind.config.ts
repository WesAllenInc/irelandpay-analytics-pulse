import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		fontFamily: {
			sans: ["var(--font-sora)", "sans-serif"],
			mono: ["var(--font-roboto-mono)", "monospace"],
		},
		extend: {
			colors: {    
				// Add Gruvbox palette
				gruvbox: {
					bg: '#282828',
					'bg-h': '#1d2021',
					'bg-0': '#282828',
					'bg-s': '#32302f',
					'bg-1': '#3c3836',
					'bg-2': '#504945',
					'bg-3': '#665c54',
					'bg-4': '#7c6f64',
					red: '#cc241d',
					'red-bright': '#fb4934',
					green: '#98971a',
					'green-bright': '#b8bb26',
					yellow: '#d79921',
					'yellow-bright': '#fabd2f',
					blue: '#458588',
					'blue-bright': '#83a598',
					purple: '#b16286',
					'purple-bright': '#d3869b',
					aqua: '#689d6a',
					'aqua-bright': '#8ec07c',
					orange: '#d65d0e',
					'orange-bright': '#fe8019',
					gray: '#928374',
					'gray-alt': '#a89984',
					'fg-0': '#fbf1c7',
					'fg-1': '#ebdbb2',
					'fg-2': '#d5c4a1',
					'fg-3': '#bdae93',
					'fg-4': '#a89984',
				},
				// Update primary colors
				customPrimary: {
					DEFAULT: '#d79921', // Gruvbox Yellow
					foreground: '#1d2021',
				},
				customSuccess: '#98971a', // Gruvbox Green
				customDanger: '#cc241d', // Gruvbox Red
				customWarning: '#d79921', // Gruvbox Yellow
				// Add dark mode CSS variables
				'primary-dark': 'var(--primary-dark, #d79921)',
				'success-dark': 'var(--success-dark, #98971a)',
				'danger-dark': 'var(--danger-dark, #cc241d)',
				'warning-dark': 'var(--warning-dark, #d79921)',
				// shadcn/ui colors
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
