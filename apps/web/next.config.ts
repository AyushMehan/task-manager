import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source rather than a build artefact,
  // so Next compiles it alongside the app.
  transpilePackages: ['@task-manager/shared'],

  // Self-contained server bundle, so the runtime image does not need the
  // whole workspace's node_modules.
  output: 'standalone',
  // fileURLToPath, not URL.pathname: the latter yields "/C:/..." on Windows.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),

  /**
   * The browser only ever talks to this origin: `/api/*` is proxied to the API
   * service server-side. That means no CORS, and one port to expose over
   * Tailscale instead of two.
   */
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
