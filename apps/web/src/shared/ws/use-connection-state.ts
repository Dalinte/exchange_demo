import { useWsStore } from './ws-store';

export function useConnectionState() {
  return useWsStore((s) => s.state);
}
