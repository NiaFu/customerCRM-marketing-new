let authHeader: string | null = null

export function setLogin(username: string, password: string) {
  // Kept in memory only. Refreshing the page requires re-authentication.
  authHeader = 'Basic ' + btoa(username + ':' + password)
}
export function clearLogin() { authHeader = null }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error || (response.status === 401 ? 'Incorrect credentials' : 'Request failed (' + response.status + ')'))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export const post = <T,>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) })
export const put = <T,>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) })
export const patch = <T,>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
export const del = (path: string) => api<void>(path, { method: 'DELETE' })
