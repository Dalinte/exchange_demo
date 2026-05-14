'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useConnectionState } from '@/shared/ws/use-connection-state';

export function StatusFooter() {
  const [now, setNow] = useState<Date | null>(null);
  const [latency, setLatency] = useState(38);
  const wsState = useConnectionState();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      setLatency(28 + Math.floor(Math.random() * 22));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const utc = now ? now.toUTCString().slice(17, 25) : '--:--:--';
  const ping = latency < 50 ? 'var(--up)' : latency < 100 ? 'var(--brand)' : 'var(--down)';

  const connection =
    wsState === 'open'
      ? { dot: 'var(--up)', label: 'Connected' }
      : wsState === 'connecting'
        ? { dot: 'var(--brand)', label: 'Connecting' }
        : wsState === 'reconnecting'
          ? { dot: 'var(--brand)', label: 'Reconnecting' }
          : { dot: 'var(--down)', label: 'Disconnected' };

  return (
    <div
      style={{
        height: 26,
        display: 'flex',
        alignItems: 'center',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-1)',
        fontSize: 11,
        color: 'var(--text-2)',
        flexShrink: 0,
        fontFamily: 'JetBrains Mono, monospace',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Item>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: connection.dot,
            boxShadow: `0 0 6px ${connection.dot}`,
          }}
        />
        <span style={{ color: 'var(--text-1)' }}>{connection.label}</span>
      </Item>
      <Item>
        <span>API</span>
        <span style={{ color: ping }}>{latency}ms</span>
      </Item>
      <Item>
        <span>UTC</span>
        <span style={{ color: 'var(--text-1)' }}>{utc}</span>
      </Item>
      <Item>
        <span>v1.0.0-demo</span>
      </Item>

      <div style={{ flex: 1 }} />

      <FooterLink>Docs</FooterLink>
      <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
      <FooterLink>API Status</FooterLink>
      <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
      <FooterLink>Shortcuts</FooterLink>
      <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
      <FooterLink>Feedback</FooterLink>
      <Item sep={false}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--up)',
          }}
        />
        <span>All systems operational</span>
      </Item>
    </div>
  );
}

function Item({ children, sep = true }: { children: ReactNode; sep?: boolean }) {
  return (
    <>
      <span
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '100%' }}
      >
        {children}
      </span>
      {sep && <span style={{ width: 1, height: 12, background: 'var(--border)' }} />}
    </>
  );
}

function FooterLink({ children }: { children: ReactNode }) {
  return (
    <button
      style={{
        background: 'transparent',
        border: 0,
        color: 'var(--text-2)',
        padding: '0 12px',
        height: '100%',
        fontSize: 11,
      }}
      onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-0)')}
      onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
    >
      {children}
    </button>
  );
}
