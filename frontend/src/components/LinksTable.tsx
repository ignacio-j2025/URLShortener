import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteLink } from '../hooks/useLinks.js';
import type { Link } from '../types/index.js';
import styles from './LinksTable.module.css';

interface LinksTableProps {
  links: Link[];
}

export function LinksTable({ links }: LinksTableProps) {
  const navigate = useNavigate();
  const deleteLink = useDeleteLink();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  if (links.length === 0) {
    return (
      <div className={styles.empty}>
        No links yet. Create your first short link above.
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
    deleteLink.mutate(slug);
  }

  return (
    <div className={styles.wrapper}>
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
                <span className={styles.slug}>{link.slug}</span>
              </td>
              <td>
                <a
                  href={link.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.targetUrl}
                  title={link.targetUrl}
                >
                  {link.targetUrl}
                </a>
              </td>
              <td>
                <span className={styles.clickCount}>{link.totalClicks.toLocaleString()}</span>
              </td>
              <td>{new Date(link.createdAt).toLocaleDateString()}</td>
              <td>
                <div className={styles.actions}>
                  <button
                    className={`${styles.copyBtn} ${copiedSlug === link.slug ? styles.copied : ''}`}
                    onClick={() => handleCopy(link.shortUrl, link.slug)}
                  >
                    {copiedSlug === link.slug ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    className={styles.viewBtn}
                    onClick={() => navigate(`/links/${link.slug}`)}
                  >
                    Analytics
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
