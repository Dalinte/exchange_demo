'use client';

import { useToastStore } from '@/shared/stores/toast-store';

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
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
