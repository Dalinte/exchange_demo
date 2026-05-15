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
  const latencyTone: Tone = latency < 50 ? 'up' : latency < 100 ? 'brand' : 'down';

  const connection: { tone: Tone; label: string } =
    wsState === 'open'
      ? { tone: 'up', label: 'Connected' }
      : wsState === 'connecting'
        ? { tone: 'brand', label: 'Connecting' }
        : wsState === 'reconnecting'
          ? { tone: 'brand', label: 'Reconnecting' }
          : { tone: 'down', label: 'Disconnected' };

  return (
    <div className="mono flex items-center h-[26px] shrink-0 border-t border-border bg-bg-1 text-[11px] text-text-2">
      <Item>
        <span className={'w-1.5 h-1.5 rounded-full ' + dotClass(connection.tone)} />
        <span className="text-text-1">{connection.label}</span>
      </Item>
      <Item>
        <span>API</span>
        <span className={toneTextClass(latencyTone)}>{latency}ms</span>
      </Item>
      <Item>
        <span>UTC</span>
        <span className="text-text-1">{utc}</span>
      </Item>
      <Item>
        <span>v{process.env.APP_VERSION}</span>
      </Item>

      <div className="flex-1" />

      <FooterLink>Docs</FooterLink>
      <span className="w-px h-3 bg-border" />
      <FooterLink>API Status</FooterLink>
      <span className="w-px h-3 bg-border" />
      <FooterLink>Shortcuts</FooterLink>
      <span className="w-px h-3 bg-border" />
      <FooterLink>Feedback</FooterLink>
      <Item sep={false}>
        <span className="w-1.5 h-1.5 rounded-full bg-up" />
        <span>All systems operational</span>
      </Item>
    </div>
  );
}

type Tone = 'up' | 'down' | 'brand';

function dotClass(tone: Tone): string {
  if (tone === 'up') return 'bg-up shadow-[0_0_6px_var(--up)]';
  if (tone === 'down') return 'bg-down shadow-[0_0_6px_var(--down)]';
  return 'bg-brand shadow-[0_0_6px_var(--brand)]';
}

function toneTextClass(tone: Tone): string {
  if (tone === 'up') return 'text-up';
  if (tone === 'down') return 'text-down';
  return 'text-brand';
}

function Item({ children, sep = true }: { children: ReactNode; sep?: boolean }) {
  return (
    <>
      <span className="flex items-center gap-1.5 px-3 h-full">{children}</span>
      {sep && <span className="w-px h-3 bg-border" />}
    </>
  );
}

function FooterLink({ children }: { children: ReactNode }) {
  return (
    <button className="bg-transparent border-0 px-3 h-full text-[11px] text-text-2 hover:text-text-0">
      {children}
    </button>
  );
}
