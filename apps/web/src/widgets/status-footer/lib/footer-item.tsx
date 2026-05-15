import type { ReactNode } from 'react';

export function FooterItem({
  children,
  separator = true,
}: {
  children: ReactNode;
  separator?: boolean;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 px-3 h-full">{children}</span>
      {separator && <span className="w-px h-3 bg-border" />}
    </>
  );
}
