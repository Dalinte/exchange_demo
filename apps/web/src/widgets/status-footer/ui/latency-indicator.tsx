'use client';

import { useLatency } from '@/shared/ws/use-latency';
import { FooterItem } from '../lib/footer-item';
import { toneTextClass, type Tone } from '../lib/tone';

function pickTone(latency: number | null): Tone {
  if (latency == null) return 'brand';
  if (latency < 50) return 'up';
  if (latency < 100) return 'brand';
  return 'down';
}

export function LatencyIndicator() {
  const latency = useLatency();
  const tone = pickTone(latency);
  const display = latency == null ? '—' : `${latency}ms`;

  return (
    <FooterItem>
      <span>Ping</span>
      <span className={toneTextClass(tone)}>{display}</span>
    </FooterItem>
  );
}
