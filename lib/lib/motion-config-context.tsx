"use client";

// This is a replacement for the framer-motion MotionConfigContext
// It ensures we use our app's React instance for createContext
import { createContext } from 'react';

// Define proper types for the motion config
interface MotionConfig {
  transformPagePoint: (point: { x: number; y: number }) => { x: number; y: number };
  isStatic: boolean;
  reducedMotion: "never" | "always" | "user";
}

// Create our own motion config context with proper types
export const MotionConfigContext = createContext<MotionConfig>({
  transformPagePoint: (p) => p,
  isStatic: false,
  reducedMotion: "never"
});

export default MotionConfigContext;
