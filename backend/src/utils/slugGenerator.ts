import { customAlphabet } from 'nanoid';

// Exclude visually ambiguous characters (0, O, 1, l, I)
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
const generate = customAlphabet(alphabet, 8);

export function generateSlug(): string {
  return generate();
}

// Custom slugs: lowercase alphanumeric and hyphens, 3-50 chars
const CUSTOM_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$|^[a-z0-9]{3,50}$/;

export function isValidCustomSlug(slug: string): boolean {
  return CUSTOM_SLUG_RE.test(slug);
}
