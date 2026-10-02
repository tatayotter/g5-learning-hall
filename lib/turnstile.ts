// Server-side verification for components/TurnstileWidget.tsx tokens.
//
// Fails OPEN when Cloudflare itself is unreachable (flaky school connections
// shouldn't block a whole class) — create_unclaimed_child_account's per-IP cap
// is still the backstop. A missing or rejected token always fails CLOSED.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's public always-pass test secret, paired with the test site key
// the widget uses on localhost and Vercel previews.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

export type TurnstileResult = 'ok' | 'missing' | 'rejected';

function secretKey(): string | null {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) return secret;
  if (process.env.VERCEL_ENV !== 'production') return TEST_SECRET;
  return null;
}

export async function verifyTurnstileToken(token: unknown, ip: string): Promise<TurnstileResult> {
  const secret = secretKey();
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set in production; skipping bot check');
    return 'ok';
  }

  if (typeof token !== 'string' || !token) return 'missing';

  const body = new URLSearchParams({ secret, response: token });
  if (ip !== 'unknown') body.set('remoteip', ip);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (result.success) return 'ok';
    console.warn('Turnstile rejected token:', result['error-codes']);
    return 'rejected';
  } catch (err) {
    console.error('Turnstile siteverify unreachable; allowing signup:', err);
    return 'ok';
  }
}
