// Fix for duplicate React instances - ensures all components use the same React instance
import React from 'react';
export { React as default };
export const { 
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
  forwardRef,
  Children,
  isValidElement
} = React;
