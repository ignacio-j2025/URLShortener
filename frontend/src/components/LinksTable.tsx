import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteLink } from '../hooks/useLinks.js';
import type { Link } from '../types/index.js';
import styles from './LinksTable.module.css';

interface LinksTableProps {
  links: Link[];
  totalLinks?: number;
}

export function LinksTable({ links, totalLinks }: LinksTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteLink = useDeleteLink();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (links.length === 0) {
    return (
      <div className={styles.empty}>
        {!totalLinks
          ? 'No links yet. Create your first short link above.'
          : 'No links on this page.'}
      </div>
    );
  }

  async function handleCopy(shortUrl: string, slug: string) {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function handleDelete(slug: string) {
    if (!confirm(`Delete /${slug}? This will remove all click history.`)) return;
    setDeleteError(null);
    deleteLink.mutate(slug, {
      onError: (err) => {
        setDeleteError(
          err instanceof Error ? err.message : 'Failed to delete link'
        );
      },
    });
  }

  return (
    <div className={styles.wrapper}>
      {deleteError && (
        <div className={styles.deleteError}>
          {deleteError}
          <button className={styles.dismissBtn} onClick={() => setDeleteError(null)}>✕</button>
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Slug</th>
            <th>Destination</th>
            <th>Clicks</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id}>
              <td>
                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.slugLink}
                  title={`Open /${link.slug} (records a click)`}
                  onClick={() => {
                    // After the redirect tab opens, give the backend a moment
                    // to record the click, then refresh the links list.
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['links'] });
                    }, 800);
                  }}
                  onContextMenu={() => {
                    // Right-click (e.g. "Open in new tab") doesn't fire onClick,
                    // so we also invalidate on context menu with a longer delay
                    // to allow the user to navigate and the backend to record the click.
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ['links'] });
                    }, 800);
                  }}
                >
                  {link.slug}
                </a>
              </td>
              <td>
                <span className={styles.targetUrl} title={link.targetUrl}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(link.targetUrl).hostname}&sz=16`}
                    alt=""
                    className={styles.favicon}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <a
                    href={link.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.targetLink}
                  >
                    {link.targetUrl}
                  </a>
                </span>
              </td>
              <td>
                <span className={styles.clickCount}>{link.totalClicks.toLocaleString()}</span>
              </td>
              <td>{new Date(link.createdAt).toLocaleDateString()}</td>
              <td>
                <div className={styles.actions}>
                  <button
                    className={styles.viewBtn}
                    onClick={() => navigate(`/links/${link.slug}`)}
                  >
                    Analytics
                  </button>
                  <button
                    className={`${styles.copyBtn} ${copiedSlug === link.slug ? styles.copied : ''}`}
                    onClick={() => handleCopy(link.shortUrl, link.slug)}
                  >
                    {copiedSlug === link.slug ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(link.slug)}
                    disabled={deleteLink.isPending}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
