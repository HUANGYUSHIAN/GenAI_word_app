"use client";

import { Box, Typography, Paper } from "@mui/material";

export default function SupplierPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        歡迎來到廠商專區
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>請從左側選單選擇功能</Typography>
      </Paper>
    </Box>
  );
}



