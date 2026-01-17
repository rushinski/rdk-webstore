import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const supabaseRemotePattern = supabaseHostname
  ? ({
      protocol: "https",
      hostname: supabaseHostname,
      pathname: "/storage/v1/object/public/**",
    } as const)
  : null;

const nextConfig = {
  reactStrictMode: true,
  images: {
    qualities: [75, 90],
    remotePatterns: [
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      } as const,
    ],
  },
} satisfies NextConfig;

export default nextConfig;
