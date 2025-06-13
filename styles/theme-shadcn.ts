/**
 * Modern financial analytics dashboard theme configuration
 * Based on shadcn/ui theming system
 */

type ThemeConfig = {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  },
  borderRadius: number;
  boxShadow: {
    sm: string;
    md: string;
    lg: string;
  }
};

export const theme: ThemeConfig = {
  name: "Ireland Pay Analytics",
  colors: {
    primary: "hsl(213, 94%, 50%)",
    secondary: "hsl(215, 16%, 47%)",
    accent: "hsl(213, 94%, 95%)",
    background: "hsl(210, 20%, 98%)",
    foreground: "hsl(224, 71%, 4%)",
    muted: "hsl(220, 14%, 96%)",
    border: "hsl(220, 13%, 91%)",
    success: "hsl(142, 71%, 45%)",
    warning: "hsl(38, 92%, 50%)",
    danger: "hsl(0, 84%, 60%)",
    info: "hsl(213, 94%, 50%)",
  },
  borderRadius: 8, // 0.5rem
  boxShadow: {
    sm: "0px 1px 2px rgba(16, 24, 40, 0.05)",
    md: "0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)",
    lg: "0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)",
  }
};

export const darkTheme: ThemeConfig = {
  name: "Ireland Pay Analytics Dark",
  colors: {
    primary: "hsl(213, 94%, 60%)",
    secondary: "hsl(215, 16%, 57%)",
    accent: "hsl(213, 94%, 15%)",
    background: "hsl(224, 71%, 4%)",
    foreground: "hsl(213, 31%, 91%)",
    muted: "hsl(215, 27%, 16%)",
    border: "hsl(215, 27%, 16%)",
    success: "hsl(142, 69%, 44%)",
    warning: "hsl(43, 96%, 58%)",
    danger: "hsl(0, 74%, 54%)",
    info: "hsl(213, 94%, 60%)",
  },
  borderRadius: 8, // 0.5rem
  boxShadow: {
    sm: "0px 1px 2px rgba(0, 0, 0, 0.4)",
    md: "0px 4px 8px -2px rgba(0, 0, 0, 0.4), 0px 2px 4px -2px rgba(0, 0, 0, 0.2)",
    lg: "0px 12px 16px -4px rgba(0, 0, 0, 0.4), 0px 4px 6px -2px rgba(0, 0, 0, 0.1)",
  }
};

export default theme;
