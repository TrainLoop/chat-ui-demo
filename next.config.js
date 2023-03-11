/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/fastapi/:path*',
        destination: 'http://localhost:8000/:path*', // Assuming FastAPI runs on port 8000
      },
    ];
  },
}

module.exports = nextConfig
