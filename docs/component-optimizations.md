# Component Optimization Guide

This document provides specific guidance on optimizing components in the Ireland Pay Analytics project, with code examples and patterns to follow.

## Table of Contents
- [When to Use Memoization](#when-to-use-memoization)
- [Component-Specific Optimizations](#component-specific-optimizations)
- [Custom Hooks](#custom-hooks)
- [Performance Anti-patterns](#performance-anti-patterns)
- [Testing Memoized Components](#testing-memoized-components)

## When to Use Memoization

### Good Candidates for Memoization

1. **Complex rendering components** - Components with many elements or deep hierarchies
2. **Computationally expensive components** - Components that perform heavy calculations
3. **Components that render frequently** - Components in loops or lists
4. **Components whose props rarely change** - Static or semi-static displays

### Poor Candidates for Memoization

1. Components whose props change on nearly every render
2. Simple components with minimal rendering cost
3. Components that rely heavily on context or other external state

## Component-Specific Optimizations

### Table Components

Tables are particularly render-heavy and benefit from optimization:

```tsx
// AgentMerchantTable.tsx pattern
export const AgentMerchantTable = React.memo(function AgentMerchantTable({ 
  merchants, 
  isLoading 
}: AgentMerchantTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Memoize filtered data to avoid recalculating on every render
  const filteredMerchants = useMemo(() => {
    if (!searchTerm.trim()) return merchants;
    return merchants.filter(merchant => 
      merchant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [merchants, searchTerm]);
  
  // Memoize functions passed to child components
  const exportToCSV = useCallback(() => {
    // Export logic here
  }, [filteredMerchants]);
  
  // Render component
});
```

### Chart Components

Charts are typically expensive to render and benefit significantly from memoization:

```tsx
// RechartsAgentVolumeChart.tsx pattern
export const RechartsAgentVolumeChart = React.memo(function RechartsAgentVolumeChart({
  data,
  height = 400
}: RechartsAgentVolumeChartProps) {
  // Memoize formatted data to prevent unnecessary recalculations
  const formattedData = useMemo(() => {
    return data.map(item => ({
      name: formatDate(item.date),
      volume: item.value
    }));
  }, [data]);
  
  // Memoize event handlers and formatters
  const yAxisFormatter = useCallback((value: number) => {
    return `$${(value / 1000).toFixed(1)}k`;
  }, []);
  
  // Render chart
});
```

### Card Components

For repeating card components that appear multiple times on a page:

```tsx
// MetricCard.tsx pattern
export const MetricCard = React.memo(function MetricCard({
  title,
  value,
  change,
  icon,
  trend = 'neutral'
}: MetricCardProps) {
  // Simple components still benefit from memoization when used repeatedly
});
```

## Custom Hooks

Extract complex logic into custom hooks to improve readability and testability:

```tsx
// useAgentDashboard.ts example
export function useAgentDashboard(agentId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch data logic
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [agentId]);
  
  return { merchants, volumeData, isLoading };
}
```

## Performance Anti-patterns

Avoid these common pitfalls:

### 1. Creating Functions or Objects in Render

```tsx
// ❌ Bad: Creates a new function on every render
<Button onClick={() => handleClick(id)} />

// ✅ Good: Use useCallback to memoize the function
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id, handleClick]);

<Button onClick={handleButtonClick} />
```

### 2. Inline Object Creation

```tsx
// ❌ Bad: Creates a new object on every render
<Component style={{ margin: '10px', color: 'blue' }} />

// ✅ Good: Move styles out of render
const componentStyle = { margin: '10px', color: 'blue' };
<Component style={componentStyle} />

// ✅ Better: Use CSS modules or Tailwind
<Component className={styles.component} />
```

### 3. Using Index as Key in Lists

```tsx
// ❌ Bad: Using array index as key
{items.map((item, index) => (
  <Item key={index} data={item} />
))}

// ✅ Good: Using unique identifier
{items.map(item => (
  <Item key={item.id} data={item} />
))}
```

## Testing Memoized Components

When testing memoized components, remember:

1. Test the behavior, not the memoization
2. Ensure props changes re-render appropriately
3. Verify that callbacks work correctly

Example test with Vitest:

```tsx
it('should update when props change', () => {
  const { rerender, getByText } = render(<MetricCard title="Revenue" value="$1000" />);
  expect(getByText('$1000')).toBeInTheDocument();
  
  // Re-render with changed props
  rerender(<MetricCard title="Revenue" value="$2000" />);
  expect(getByText('$2000')).toBeInTheDocument();
});
```

---

Following these optimization patterns consistently will ensure the Ireland Pay Analytics application maintains excellent performance as it grows and evolves.
