import { useWsStore } from '@/shared/stores/ws-store';

export function useConnectionState() {
  return useWsStore((s) => s.state);
}
