import { FooterItem } from '../lib/footer-item';

export function SystemsStatus() {
  return (
    <FooterItem separator={false}>
      <span className="w-1.5 h-1.5 rounded-full bg-up" />
      <span>All systems operational</span>
    </FooterItem>
  );
}
