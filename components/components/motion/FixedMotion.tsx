"use client";

// Fixed Motion component wrapper to avoid React createContext errors
import React from 'react';
import * as framerMotion from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { MotionConfigContext } from '../../lib/motion-config-context';

// Create wrapper components for each HTML element type
// These use the consistent React instance via our custom context
const createMotionComponent = <T extends keyof React.JSX.IntrinsicElements>(
  component: T
) => {
  return React.forwardRef<React.ElementRef<T>, HTMLMotionProps<T>>((props, ref) => (
    <MotionConfigContext.Provider value={{ transformPagePoint: (p: {x: number; y: number}) => p, isStatic: false, reducedMotion: "never" }}>
      {React.createElement(framerMotion.motion[component], { ...props, ref })}
    </MotionConfigContext.Provider>
  ));
};

// Create motion object with all HTML element types
export const motion = {
  div: createMotionComponent('div'),
  button: createMotionComponent('button'),
  span: createMotionComponent('span'),
  a: createMotionComponent('a'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  nav: createMotionComponent('nav'),
  aside: createMotionComponent('aside'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  main: createMotionComponent('main'),
  p: createMotionComponent('p'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  h5: createMotionComponent('h5'),
  h6: createMotionComponent('h6')
};

// Export AnimatePresence and other useful utilities from framer-motion
export const AnimatePresence = framerMotion.AnimatePresence;
export const useAnimation = framerMotion.useAnimation;
export const useMotionValue = framerMotion.useMotionValue;
export const useTransform = framerMotion.useTransform;

export default motion;
