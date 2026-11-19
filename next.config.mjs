/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // The Protocol tab reads this guide at request time; bundle it with that function.
  outputFileTracingIncludes: {
    "/api/outreach-protocol": ["./docs/guides/ig-outreach-protocol.md"],
  },
};

export default nextConfig;
