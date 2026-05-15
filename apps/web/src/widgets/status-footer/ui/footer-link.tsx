import type { ReactNode } from 'react';

export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-transparent border-0 px-3 h-full flex items-center text-[11px] text-text-2 hover:text-text-0"
    >
      {children}
    </a>
  );
}
