import { Fragment } from 'react';
import { FooterLink } from './footer-link';

const links: { label: string; href: string | undefined }[] = [
  { label: 'GitHub', href: process.env.NEXT_PUBLIC_GITHUB_URL },
  { label: 'API Docs', href: process.env.NEXT_PUBLIC_API_DOCS_URL },
  { label: 'Docs', href: process.env.NEXT_PUBLIC_DOCS_URL },
];

export function FooterLinks() {
  const visible = links.filter((link): link is { label: string; href: string } =>
    Boolean(link.href),
  );
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((link, index) => (
        <Fragment key={link.label}>
          <FooterLink href={link.href}>{link.label}</FooterLink>
          {index < visible.length - 1 && <span className="w-px h-3 bg-border" />}
        </Fragment>
      ))}
    </>
  );
}
