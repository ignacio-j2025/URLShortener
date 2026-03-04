import { useState } from 'react';
import { useLinks } from '../hooks/useLinks.js';
import { CreateLinkForm } from '../components/CreateLinkForm.js';
import { LinksTable } from '../components/LinksTable.js';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, isError, error, refetch } = useLinks(page, limit);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>URL Shortener</h1>
        <p className={styles.subtitle}>Create and manage short links, track clicks.</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Create a new short link</h2>
        <CreateLinkForm />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Your links {data ? `(${data.total.toLocaleString()})` : ''}
        </h2>

        {isError && (
          <div className={styles.error}>
            Failed to load links: {error instanceof Error ? error.message : 'Unknown error'}
            <button className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {isLoading
          ? <div className={styles.loading}>Loading…</div>
          : data && <LinksTable links={data.items} totalLinks={data.total} />
        }

        {data && totalPages > 1 && (
          <div className={styles.pagination}>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
