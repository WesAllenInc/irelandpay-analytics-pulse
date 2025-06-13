// This is a replacement for the framer-motion MotionConfigContext
// It ensures we use our app's React instance for createContext
import { createContext } from 'react';

// Create our own motion config context
export const MotionConfigContext = createContext({
  transformPagePoint: (p) => p,
  isStatic: false,
  reducedMotion: "never"
});

export default MotionConfigContext;
