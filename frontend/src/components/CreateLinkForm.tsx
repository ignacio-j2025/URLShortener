import { useState, FormEvent } from 'react';
import { useCreateLink } from '../hooks/useLinks.js';
import { ApiRequestError } from '../api/client.js';
import styles from './CreateLinkForm.module.css';

const URL_RE = /^https?:\/\/[^\s/$.?#]+\.[^\s]+$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$|^[a-z0-9]{3}$/;

export function CreateLinkForm() {
  const [targetUrl, setTargetUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [urlError, setUrlError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [apiError, setApiError] = useState('');

  const { mutate, isPending } = useCreateLink();

  function validate(url: string): boolean {
    let valid = true;
    setUrlError('');
    setSlugError('');

    if (!url) {
      setUrlError('Target URL is required');
      valid = false;
    } else if (!URL_RE.test(url)) {
      setUrlError('Must be a valid URL starting with http:// or https://');
      valid = false;
    }

    if (slug.trim() && !SLUG_RE.test(slug.trim())) {
      setSlugError('3–50 characters; lowercase letters, numbers, and hyphens only');
      valid = false;
    }

    return valid;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');

    // Auto-prepend https:// if user typed a bare domain
    let url = targetUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
      setTargetUrl(url);
    }

    if (!validate(url)) return;

    mutate(
      { targetUrl: url, slug: slug.trim() || undefined },
      {
        onSuccess: () => {
          setTargetUrl('');
          setSlug('');
        },
        onError: (err) => {
          if (err instanceof ApiRequestError) {
            if (err.code === 'SLUG_TAKEN') {
              setSlugError('That slug is already taken');
            } else {
              setApiError(err.message);
            }
          } else {
            setApiError('Something went wrong. Please try again.');
          }
        },
      }
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {apiError && <div className={styles.apiError}>{apiError}</div>}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="targetUrl">
            Destination URL<span className={styles.required}>*</span>
          </label>
          <input
            id="targetUrl"
            type="url"
            className={`${styles.input} ${urlError ? styles.error : ''}`}
            placeholder="https://example.com/long/path"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            disabled={isPending}
          />
          {urlError && <span className={styles.fieldError}>{urlError}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="slug">
            Custom slug <span className={styles.hint}>(optional)</span>
          </label>
          <input
            id="slug"
            type="text"
            className={`${styles.input} ${slugError ? styles.error : ''}`}
            placeholder="my-link"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            disabled={isPending}
          />
          {slugError
            ? <span className={styles.fieldError}>{slugError}</span>
            : <span className={styles.hint}>Leave blank for an auto-generated slug</span>
          }
        </div>
      </div>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Creating…' : 'Create short link'}
      </button>
    </form>
  );
}
