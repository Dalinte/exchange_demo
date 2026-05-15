'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import type { ConnectionState } from '@/shared/ws/client';
import { useWsStore } from '@/shared/ws/ws-store';
import { dotClass, type Tone } from '../lib/tone';

interface StatusLabel {
  tone: Tone;
  label: string;
}

function aggregateStatus(
  state: ConnectionState,
  upstreamConnected: boolean | null,
): StatusLabel {
  if (state === 'closed') return { tone: 'down', label: 'Disconnected' };
  if (state === 'connecting') return { tone: 'brand', label: 'Connecting' };
  if (state === 'reconnecting') return { tone: 'brand', label: 'Reconnecting' };
  if (upstreamConnected === false) {
    return { tone: 'down', label: 'Feed offline' };
  }
  return { tone: 'up', label: 'Connected' };
}

function serverWsStatus(state: ConnectionState): StatusLabel {
  if (state === 'open') return { tone: 'up', label: 'Connected' };
  if (state === 'closed') return { tone: 'down', label: 'Disconnected' };
  return {
    tone: 'brand',
    label: state === 'connecting' ? 'Connecting' : 'Reconnecting',
  };
}

function marketFeedStatus(
  state: ConnectionState,
  upstreamConnected: boolean | null,
): StatusLabel {
  if (state !== 'open' || upstreamConnected === null) {
    return { tone: 'brand', label: 'Unknown' };
  }
  return upstreamConnected
    ? { tone: 'up', label: 'Connected' }
    : { tone: 'down', label: 'Disconnected' };
}

interface ConnectionRowProps {
  name: string;
  status: StatusLabel;
  latency: string;
}

function ConnectionRow({ name, status, latency }: ConnectionRowProps) {
  return (
    <TableRow>
      <TableCell className="px-3 py-1.5 text-text-1">{name}</TableCell>
      <TableCell className="px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={'w-1.5 h-1.5 rounded-full ' + dotClass(status.tone)}
          />
          <span className="text-text-1">{status.label}</span>
        </span>
      </TableCell>
      <TableCell className="px-3 py-1.5 text-right text-text-1">
        {latency}
      </TableCell>
    </TableRow>
  );
}

export function ConnectionIndicator() {
  const [open, setOpen] = useState(false);
  const state = useWsStore((s) => s.state);
  const latencyMs = useWsStore((s) => s.latencyMs);
  const upstreamConnected = useWsStore((s) => s.upstreamConnected);

  const aggregate = aggregateStatus(state, upstreamConnected);
  const serverWs = serverWsStatus(state);
  const marketFeed = marketFeedStatus(state, upstreamConnected);
  const serverWsLatency = latencyMs === null ? '—' : `${latencyMs}ms`;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className="flex items-center gap-1.5 px-3 h-full outline-none hover:bg-bg-hover/60"
          >
            <span
              className={'w-1.5 h-1.5 rounded-full ' + dotClass(aggregate.tone)}
            />
            <span className="text-text-1">{aggregate.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="mono w-auto min-w-[280px] p-0 text-[11px]"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-3 font-normal text-text-2">
                  Connection
                </TableHead>
                <TableHead className="h-8 px-3 font-normal text-text-2">
                  Status
                </TableHead>
                <TableHead className="h-8 px-3 text-right font-normal text-text-2">
                  Latency
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ConnectionRow
                name="Server WS"
                status={serverWs}
                latency={serverWsLatency}
              />
              <ConnectionRow
                name="Market feed"
                status={marketFeed}
                latency="—"
              />
            </TableBody>
          </Table>
        </PopoverContent>
      </Popover>
      <span className="w-px h-3 bg-border" />
    </>
  );
}
