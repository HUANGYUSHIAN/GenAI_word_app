"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { Box } from "@mui/material";

export function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  const { scale, isPortrait } = useResponsive();

  return (
    <Box
      sx={{
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: isPortrait ? "100vw" : "1920px",
        height: isPortrait ? "100vh" : "1080px",
        overflow: "auto",
      }}
    >
      {children}
    </Box>
  );
}



