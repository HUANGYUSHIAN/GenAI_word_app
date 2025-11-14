"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到用戶管理頁面（第一個菜單項）
    router.replace("/admin/user");
  }, [router]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

