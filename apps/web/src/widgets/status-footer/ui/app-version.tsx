import { FooterItem } from '../lib/footer-item';

export function AppVersion() {
  return (
    <FooterItem>
      <span>v{process.env.APP_VERSION}</span>
    </FooterItem>
  );
}
