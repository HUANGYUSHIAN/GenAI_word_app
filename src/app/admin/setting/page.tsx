"use client";

import { Box, Typography, Paper, TextField, Button, Alert } from "@mui/material";
import { useState } from "react";

export default function AdminSettingPage() {
  const [settings, setSettings] = useState({
    siteName: "GenAI Word App",
    siteDescription: "",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // TODO: 實作儲存設定
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        網頁設定
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          設定已儲存
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="網站名稱"
            value={settings.siteName}
            onChange={(e) =>
              setSettings({ ...settings, siteName: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="網站描述"
            value={settings.siteDescription}
            onChange={(e) =>
              setSettings({ ...settings, siteDescription: e.target.value })
            }
            fullWidth
            multiline
            rows={3}
          />
          <Button variant="contained" onClick={handleSave}>
            儲存設定
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}



