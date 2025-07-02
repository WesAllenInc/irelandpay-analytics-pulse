# Performance Optimizations Guide

This document outlines the performance optimization strategies implemented in the Ireland Pay Analytics project. Following these guidelines will help maintain optimal performance as the application continues to grow.

## Table of Contents
- [Component Memoization](#component-memoization)
- [React Hooks for Memoization](#react-hooks-for-memoization)
- [Dynamic Imports](#dynamic-imports)
- [State Management Best Practices](#state-management-best-practices)
- [CSS & Style Optimization](#css--style-optimization)
- [Next.js Specific Optimizations](#nextjs-specific-optimizations)

## Component Memoization

### React.memo

We use `React.memo` to prevent unnecessary re-renders of components when their props haven't changed. This is especially important for components that:

- Are expensive to render
- Render frequently
- Rarely change based on their props

**Example Implementation:**

```tsx
// Before optimization
export function MyComponent(props: MyComponentProps) {
  // Component implementation
}

// After optimization
export const MyComponent = React.memo(function MyComponent(props: MyComponentProps) {
  // Component implementation
});
```

### Components Using React.memo

The following components use React.memo:

- `AgentMerchantTable`: Prevents re-renders when parent components update
- `AgentVolumeChart`: Optimizes chart rendering performance
- `RechartsAgentVolumeChart`: Prevents expensive chart re-rendering
- `MetricCard`: Optimizes cards that rarely change
- `KPICard`: Optimizes sparkline visualization cards

## React Hooks for Memoization

### useMemo

Use `useMemo` to memoize expensive calculations or values that don't need to be recomputed on every render.

**Example:**

```tsx
// Expensive data transformation
const filteredData = useMemo(() => {
  return data.filter(item => item.name.includes(searchTerm));
}, [data, searchTerm]);
```

### useCallback

Use `useCallback` to memoize functions, especially those passed as props to memoized child components.

**Example:**

```tsx
// Memoizing event handlers
const handleClick = useCallback(() => {
  // Implementation
}, [dependency1, dependency2]);
```

### Current Implementations

- **AgentMerchantTable**:
  - `useMemo` for filtered merchant data
  - `useCallback` for CSV export and currency formatting functions

- **AgentVolumeChart**:
  - `useCallback` for month label formatting
  - `useMemo` for chart summary string

- **RechartsAgentVolumeChart**:
  - `useMemo` for formatted chart data
  - `useCallback` for y-axis formatter and custom tooltip

- **KPICard**:
  - `useMemo` for accessible sparkline trend description
  - `useCallback` for keyboard event handlers

## Dynamic Imports

We use dynamic imports to lazy-load components that:
- Are not immediately needed on page load
- Are large or have heavy dependencies
- Are below the fold or conditionally displayed

### Implementation with Next.js

```tsx
// Dynamic import with loading state
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <div className="h-80 w-full animate-pulse bg-muted rounded-lg"></div> }
);
```

### Components Using Dynamic Imports

- `TradingViewWidget`: Chart with heavy dependencies
- `TotalSalesChart`: Complex visualization component
- `EstimatedProfitChart`: Component with detailed merchant data visualization

## State Management Best Practices

- Use `useAgentDashboard` custom hook to separate data fetching logic
- Keep state as local as possible to reduce unnecessary re-renders
- Use context selectively for truly global state
- Prefer props drilling for 1-2 levels of component hierarchy
- Use Zustand store slices for specific feature domains

## CSS & Style Optimization

- Use CSS modules for component-specific styling
- Leverage Tailwind's utility classes for common patterns
- Use CSS variables for dynamic values that change based on state or props
- Avoid inline styles except for truly dynamic values (prefer CSS variables)

## Next.js Specific Optimizations

- Use `dynamic` import for heavy components
- Set appropriate `loading` strategy (`eager` vs `lazy`)
- Implement proper caching strategies with `revalidate` and `force-dynamic`
- Split large pages into smaller components with appropriate loading boundaries

---

## Performance Testing

Before and after implementing optimizations, consider testing performance with:

1. React DevTools Profiler
2. Lighthouse scores for key pages
3. Chrome DevTools Performance tab

Document baseline metrics and improvements to track progress over time.
