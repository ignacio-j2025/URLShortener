import { customAlphabet } from 'nanoid';

// Exclude visually ambiguous characters (0, O, 1, l, I)
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
const generate = customAlphabet(alphabet, 8);

export function generateSlug(): string {
  return generate();
}
