import { AppVersion } from './app-version';
import { ConnectionIndicator } from './connection-indicator';
import { FooterLinks } from './footer-links';
import { LatencyIndicator } from './latency-indicator';
import { SystemsStatus } from './systems-status';
import { UtcClock } from './utc-clock';

export function StatusFooter() {
  return (
    <div className="mono flex items-center h-[26px] shrink-0 border-t border-border bg-bg-1 text-[11px] text-text-2">
      <ConnectionIndicator />
      <LatencyIndicator />
      <UtcClock />
      <AppVersion />

      <div className="flex-1" />

      <FooterLinks />
      <SystemsStatus />
    </div>
  );
}
