export function label(value: string) { return value.replace(/_/g, ' ').replace(/\b\w+/g, word => word[0].toUpperCase() + word.slice(1).toLowerCase()); }
export function currency(value: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value); }
export function dateTime(value: string | null | undefined) { return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
export function date(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'; }
export function duration(seconds: number) { return `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
export function percent(value: number) { return `${value.toFixed(1)}%`; }
export function toLocalInput(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
