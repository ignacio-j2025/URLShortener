import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ClicksByDay } from '../types/index.js';
import styles from './ClickChart.module.css';

interface ClickChartProps {
  data: ClicksByDay[];
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
}

export function ClickChart({ data }: ClickChartProps) {
  if (data.length === 0) {
    return <div className={styles.empty}>No click data for this period</div>;
  }

  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ fontSize: 13, borderColor: '#e2e8f0' }}
            formatter={(value: number) => [value, 'Clicks']}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="clicks" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
