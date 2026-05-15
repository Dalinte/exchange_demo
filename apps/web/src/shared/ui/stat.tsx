import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface StatProps {
  label: string;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function Stat({ label, children, className, align = 'left' }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', align === 'right' && 'text-right')}>
      <div className="text-[10px] text-text-2 uppercase tracking-wider">{label}</div>
      <div className={cn('text-[12px] font-medium', className)}>{children}</div>
    </div>
  );
}
