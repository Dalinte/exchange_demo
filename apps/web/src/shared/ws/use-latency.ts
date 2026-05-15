import { useWsStore } from './ws-store';

export function useLatency(): number | null {
  return useWsStore((s) => s.latencyMs);
}
