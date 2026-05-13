'use client';

import type { Toast } from '@/features/trade-terminal/types';

interface ToastsProps {
  toasts: Toast[];
}

export function Toasts({ toasts }: ToastsProps) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + (t.kind || '')}>
          <div className="t-title">{t.title}</div>
          {t.sub && <div className="t-sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}
