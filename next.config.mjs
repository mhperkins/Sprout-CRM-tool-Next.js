/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Bundle the Outreach employee's markdown artifacts into the /api/outreach
  // serverless function so the fs reads work on Vercel (non-imported files are
  // otherwise not traced into the deployment).
  outputFileTracingIncludes: {
    "/api/outreach": ["./virtual-agency/employees/Outreach/**/*.md"],
  },
};

export default nextConfig;