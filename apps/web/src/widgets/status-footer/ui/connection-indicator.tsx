'use client';

import type { ConnectionState } from '@/shared/ws/client';
import { useConnectionState } from '@/shared/ws/use-connection-state';
import { FooterItem } from '../lib/footer-item';
import { dotClass, type Tone } from '../lib/tone';

const stateMap: Record<ConnectionState, { tone: Tone; label: string }> = {
  open: { tone: 'up', label: 'Connected' },
  connecting: { tone: 'brand', label: 'Connecting' },
  reconnecting: { tone: 'brand', label: 'Reconnecting' },
  closed: { tone: 'down', label: 'Disconnected' },
};

export function ConnectionIndicator() {
  const wsState = useConnectionState();
  const { tone, label } = stateMap[wsState];

  return (
    <FooterItem>
      <span className={'w-1.5 h-1.5 rounded-full ' + dotClass(tone)} />
      <span className="text-text-1">{label}</span>
    </FooterItem>
  );
}
