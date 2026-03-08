import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./next-intl.config.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default withNextIntl(nextConfig)