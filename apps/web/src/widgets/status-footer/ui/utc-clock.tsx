'use client';

import { useEffect, useState } from 'react';
import { FooterItem } from '../lib/footer-item';

export function UtcClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utc = now ? now.toUTCString().slice(17, 25) : '--:--:--';

  return (
    <FooterItem>
      <span>UTC</span>
      <span className="text-text-1">{utc}</span>
    </FooterItem>
  );
}
