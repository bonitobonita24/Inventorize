/**
 * Cloudflare Turnstile server-side token verification (V28)
 * MANDATORY — client-side widget alone provides NO protection.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Usage:
 *   import { verifyTurnstileToken } from '@/server/lib/turnstile'
 *   const ok = await verifyTurnstileToken(token, remoteIp)
 *   if (!ok) throw new TRPCError({ code: 'FORBIDDEN' })
 */

interface TurnstileSiteverifyResponse {
  success: boolean;
  'error-codes': string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verifies a Cloudflare Turnstile challenge token against the siteverify API.
 * Returns true if the token is valid and the challenge was passed.
 *
 * @param token - The token from the Turnstile widget (cf-turnstile-response)
 * @param remoteIp - Optional: the client IP address for additional validation
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env['TURNSTILE_SECRET_KEY'];
  if (secretKey === undefined || secretKey === '') {
    // In development without real keys the test secret always passes — log and continue
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not set');
    return false;
  }

  const params: Record<string, string> = {
    secret: secretKey,
    response: token,
  };
  if (remoteIp !== undefined && remoteIp !== '') {
    params['remoteip'] = remoteIp;
  }

  const body = new URLSearchParams(params);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error('[turnstile] siteverify HTTP error', response.status);
      return false;
    }

    const data = (await response.json()) as TurnstileSiteverifyResponse;

    if (!data.success && data['error-codes'].length > 0) {
      console.error('[turnstile] token rejected:', data['error-codes'].join(', '));
    }

    return data.success === true;
  } catch (err) {
    console.error('[turnstile] siteverify fetch failed:', err);
    return false;
  }
}
