import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPackage = JSON.parse(
  readFileSync(resolve(process.cwd(), '..', '..', 'package.json'), 'utf-8'),
) as { version: string };

const nextConfig: NextConfig = {
  transpilePackages: ['@exchange/shared'],
  env: {
    APP_VERSION: rootPackage.version,
  },
};

export default nextConfig;
