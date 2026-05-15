export type Tone = 'up' | 'down' | 'brand';

export function dotClass(tone: Tone): string {
  if (tone === 'up') return 'bg-up shadow-[0_0_6px_var(--up)]';
  if (tone === 'down') return 'bg-down shadow-[0_0_6px_var(--down)]';
  return 'bg-brand shadow-[0_0_6px_var(--brand)]';
}

export function toneTextClass(tone: Tone): string {
  if (tone === 'up') return 'text-up';
  if (tone === 'down') return 'text-down';
  return 'text-brand';
}
