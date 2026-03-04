import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { ApiRequestError } from '../api/client.js';
import { StatCard } from '../components/StatCard.js';
import { ClickChart } from '../components/ClickChart.js';
import styles from './LinkDetailPage.module.css';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString().slice(0, 10);
}

function formatCreatedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type QuickRange = '7d' | '30d' | '90d' | 'custom';

export function LinkDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayStr);
  const [activeRange, setActiveRange] = useState<QuickRange>('30d');
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useAnalytics(slug ?? '', from, to);

  const isNotFound = isError && error instanceof ApiRequestError && error.code === 'NOT_FOUND';

  function setQuickRange(range: QuickRange) {
    const today = todayStr();
    setActiveRange(range);
    setTo(today);
    switch (range) {
      case '7d':  setFrom(daysAgo(7)); break;
      case '30d': setFrom(daysAgo(30)); break;
      case '90d': setFrom(daysAgo(90)); break;
    }
  }

  function handleFromChange(value: string) {
    if (!value) return;
    setFrom(value);
    setActiveRange('custom');
  }

  function handleToChange(value: string) {
    if (!value) return;
    setTo(value);
    setActiveRange('custom');
  }

  async function handleCopySlug() {
    const url = data?.shortUrl ?? slug!;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rangeClicks = data
    ? data.clicksByDay.reduce((s, d) => s + d.clicks, 0)
    : 0;

  if (!slug) return null;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>
        ← Back to dashboard
      </Link>

      <div className={styles.header}>
        <div className={styles.metaCard}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Slug</span>
            <span className={styles.metaValue}>
              <a
                href={data?.shortUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.slugLink}
                title="Open short link (records a click)"
                onClick={() => {
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['analytics'] });
                    queryClient.invalidateQueries({ queryKey: ['links'] });
                  }, 800);
                }}
              >
                /{slug}
              </a>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopySlug}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </span>
          </div>
          {data && (
            <>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Target</span>
                <span className={styles.metaValue}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(data.targetUrl).hostname}&sz=16`}
                    alt=""
                    className={styles.favicon}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <a href={data.targetUrl} target="_blank" rel="noopener noreferrer" className={styles.targetLink}>
                    {data.targetUrl}
                  </a>
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Created</span>
                <span className={styles.metaValue}>{formatCreatedDate(data.createdAt)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {isError && (
        isNotFound ? (
          <div className={styles.notFound}>
            <h2>Short link not found</h2>
            <p>The slug <strong>/{slug}</strong> does not exist or has been deleted.</p>
            <Link to="/">← Back to dashboard</Link>
          </div>
        ) : (
          <div className={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load analytics'}
            <button className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
          </div>
        )
      )}

      {isLoading && <div className={styles.loading}>Loading analytics…</div>}

      {data && (
        <>
          <div className={styles.statsRow}>
            <StatCard label="Total clicks (all time)" value={data.totalClicks} />
            <StatCard label="Total clicks (range)" value={rangeClicks} />
            <StatCard label="Days in range" value={data.clicksByDay.length} />
            <StatCard
              label="Avg clicks / day"
              value={
                data.clicksByDay.length > 0
                  ? (
                      rangeClicks /
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
                <div className={styles.quickFilters}>
                  {(['7d', '30d', '90d'] as const).map((r) => (
                    <button
                      key={r}
                      className={`${styles.quickBtn} ${activeRange === r ? styles.quickBtnActive : ''}`}
                      onClick={() => setQuickRange(r)}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label>From</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={from}
                  max={to}
                  onChange={(e) => handleFromChange(e.target.value)}
                />
                <label>To</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={to}
                  min={from}
                  max={todayStr()}
                  onChange={(e) => handleToChange(e.target.value)}
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
