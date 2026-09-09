import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source rather than a build artefact,
  // so Next compiles it alongside the app.
  transpilePackages: ['@task-manager/shared'],
};

export default nextConfig;
