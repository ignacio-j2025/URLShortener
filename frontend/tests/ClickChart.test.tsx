import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClickChart } from '../src/components/ClickChart';
import type { ClicksByDay } from '../src/types/index';

// Recharts uses ResizeObserver and getBoundingClientRect for layout, which JSDOM does not
// implement. Mock the Recharts components to keep tests stable.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ data, children }: { data: unknown[]; children: React.ReactNode }) => (
    <div data-testid="bar-chart" data-points={data.length}>{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('ClickChart', () => {
  const sampleData: ClicksByDay[] = [
    { date: '2026-01-10', clicks: 5 },
    { date: '2026-01-11', clicks: 12 },
    { date: '2026-01-12', clicks: 3 },
  ];

  it('renders the chart container with data', () => {
    render(<ClickChart data={sampleData} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
    // 3 data points should be passed to the BarChart
    expect(chart.getAttribute('data-points')).toBe('3');
  });

  it('shows an empty state message when data is empty', () => {
    render(<ClickChart data={[]} />);
    expect(screen.getByText(/no click data for this period/i)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('does not show the empty state message when data is present', () => {
    render(<ClickChart data={sampleData} />);
    expect(screen.queryByText(/no click data for this period/i)).not.toBeInTheDocument();
  });
});
