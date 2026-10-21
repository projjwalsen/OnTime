/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ontime/shared'],
  reactStrictMode: true,
  async rewrites() {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const backendOrigin = rawApi.replace(/\/api\/v\d+.*$/, '');
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
