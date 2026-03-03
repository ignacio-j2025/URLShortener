import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { StatCard } from '../components/StatCard.js';
import { ClickChart } from '../components/ClickChart.js';
import styles from './LinkDetailPage.module.css';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

export function LinkDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(todayStr);

  const { data, isLoading, isError, error } = useAnalytics(slug ?? '', from, to);

  if (!slug) return null;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>
        ← Back to dashboard
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>/{slug}</h1>
        {data && (
          <p className={styles.targetUrl}>
            → <a href={data.targetUrl} target="_blank" rel="noopener noreferrer">{data.targetUrl}</a>
          </p>
        )}
      </div>

      {isError && (
        <div className={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load analytics'}
        </div>
      )}

      {isLoading && <div className={styles.loading}>Loading analytics…</div>}

      {data && (
        <>
          <div className={styles.statsRow}>
            <StatCard label="Total clicks (all time)" value={data.totalClicks} />
            <StatCard label="Days in range" value={data.clicksByDay.length} />
            <StatCard
              label="Avg clicks / day"
              value={
                data.clicksByDay.length > 0
                  ? (
                      data.clicksByDay.reduce((s, d) => s + d.clicks, 0) /
                      data.clicksByDay.length
                    ).toFixed(1)
                  : '0'
              }
            />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Clicks per day</h2>
              <div className={styles.dateFilters}>
                <label>From</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <label>To</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={to}
                  min={from}
                  max={todayStr()}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <ClickChart data={data.clicksByDay} />
          </div>
        </>
      )}
    </div>
  );
}
