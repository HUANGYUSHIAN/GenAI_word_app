import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 明确指定工作区根目录，避免警告
  ...(process.env.NODE_ENV === "production" && {
    output: "standalone",
  }),
};

export default nextConfig;
