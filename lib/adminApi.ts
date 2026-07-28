export type AdminApiResult<T extends Record<string, unknown> = Record<string, unknown>> =
  { success: boolean; error?: string } & Partial<T>;

// Shared by every admin dashboard section (components/admin/*.tsx) — was
// previously an identical fetch → JSON.parse → ok-check block copy-pasted
// into 15+ handlers, each with a chance to skip the res.ok check or the
// try/catch and surface a raw network error instead of a message.
export async function callAdminApi<T extends Record<string, unknown> = Record<string, unknown>>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<AdminApiResult<T>> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      return { ...result, success: false, error: result.error || 'Request failed.' } as AdminApiResult<T>;
    }
    return result as AdminApiResult<T>;
  } catch {
    return { success: false, error: 'Could not reach the server.' } as AdminApiResult<T>;
  }
}
