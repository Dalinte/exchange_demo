import { ApiError, NetworkError } from './client';

export function parseApiError(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Network error, check your connection';
  }
  if (error instanceof ApiError) {
    const issuesText = formatIssues(error.issues);

    if (error.status === 400) {
      if (issuesText) return issuesText;
      if (/insufficient/i.test(error.message)) return 'Insufficient balance';
      return error.message || 'Invalid request';
    }
    if (error.status === 429) return 'Too many requests, slow down';
    if (error.status === 501) return 'Limit orders are not implemented yet';
    if (error.status === 503) return 'Exchange temporarily unavailable';
    if (error.status >= 500) return 'Server error, please try again';
    return error.message || 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatIssues(issues: unknown): string {
  if (!Array.isArray(issues)) return '';
  const messages = (issues as { message?: string }[])
    .map((issue) => issue?.message ?? '')
    .filter(Boolean);
  return messages.join('; ');
}
