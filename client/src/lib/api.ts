export const TOKEN_KEY = 'pgfy_token';
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number, public details?: unknown) { super(message); this.name = 'ApiError'; } }
type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };
async function request(path: string, options: ApiOptions = {}) {
 const headers = new Headers(options.headers);
 const token = localStorage.getItem(TOKEN_KEY);
 if (token) headers.set('Authorization', `Bearer ${token}`);
 if (options.body !== undefined) headers.set('Content-Type', 'application/json');
 let response: Response;
 try { response = await fetch(`${base}${path}`, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); }
 catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; throw new Error('Unable to reach the server. Please try again.'); }
 if (!response.ok) {
  const data = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
  if (response.status === 401 && path !== '/api/auth/login') { localStorage.removeItem(TOKEN_KEY); window.dispatchEvent(new Event('pgfy:logout')); if (location.pathname !== '/login') location.assign('/login'); }
  throw new ApiError(data.error || `Request failed (${response.status})`, response.status, data.details);
 }
 return response;
}
export async function api<T>(path: string, options?: ApiOptions): Promise<T> { return (await request(path, options)).json(); }
export async function downloadReport(kind: 'leads' | 'calls' | 'performance') {
 const response = await request(`/api/reports/${kind}`);
 const blob = await response.blob();
 const filename = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') || '')?.[1] || `${kind}-${new Date().toISOString().slice(0,10)}.csv`;
 const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
