"use client";

import { useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Alert,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";

interface ImageUploadProps {
  value: string; // 圖片 URL 或 base64
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  label = "圖片",
  helperText,
  disabled = false,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 處理檔案
  const handleFile = useCallback(
    async (file: File) => {
      // 驗證檔案類型
      if (!file.type.startsWith("image/")) {
        setError("請選擇圖片檔案");
        return;
      }

      // 驗證檔案大小（限制 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError("圖片大小不能超過 5MB");
        return;
      }

      setError("");
      setUploading(true);

      try {
        // 轉換為 base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          onChange(base64);
          setUploading(false);
        };
        reader.onerror = () => {
          setError("讀取檔案失敗");
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError("處理圖片失敗");
        setUploading(false);
      }
    },
    [onChange]
  );

  // 拖放處理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile, disabled]
  );

  // 檔案選擇器
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // 貼上處理
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    },
    [handleFile, disabled]
  );

  // 清除圖片
  const handleClear = useCallback(() => {
    onChange("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {helperText}
        </Typography>
      )}

      {value ? (
        <Box sx={{ position: "relative", mb: 2 }}>
          <Paper
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              position: "relative",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 200,
                maxHeight: 400,
                overflow: "hidden",
                borderRadius: 1,
                bgcolor: "grey.100",
              }}
            >
              <img
                src={value}
                alt="預覽"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                }}
              />
            </Box>
            {!disabled && (
              <IconButton
                onClick={handleClear}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "grey.200" },
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Paper>
        </Box>
      ) : (
        <Paper
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onPaste={handlePaste}
          sx={{
            p: 4,
            border: "2px dashed",
            borderColor: dragActive ? "primary.main" : "divider",
            borderRadius: 2,
            textAlign: "center",
            bgcolor: dragActive ? "action.hover" : "background.paper",
            cursor: disabled ? "default" : "pointer",
            transition: "all 0.2s",
            "&:hover": disabled ? {} : { borderColor: "primary.main", bgcolor: "action.hover" },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={disabled}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            拖放圖片到這裡
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            或
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              選擇檔案
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentPasteIcon />}
              disabled={disabled || uploading}
              onClick={() => {
                // 提示用戶可以貼上
                alert("請使用 Ctrl+V (Windows) 或 Cmd+V (Mac) 貼上圖片");
              }}
            >
              貼上圖片
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            支援 JPG、PNG、GIF 等格式，最大 5MB
          </Typography>
          {uploading && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              處理中...
            </Typography>
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

