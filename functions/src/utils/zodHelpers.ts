import { z } from 'zod';

/**
 * A website field that accepts a bare domain ("mysite.com") in addition to
 * a fully-qualified URL, normalizing it by prepending https:// before the
 * z.string().url() check runs. Business owners very reasonably type
 * "mysite.com" rather than "https://mysite.com" — the old bare
 * z.string().url() rejected that with a generic Zod error (B4 in the fix
 * plan).
 */
export const websiteUrlSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (!value) return value;
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  })
  .refine((value) => !value || z.string().url().safeParse(value).success, {
    message: 'Website must be a valid URL or domain (e.g. mysite.com)',
  });
