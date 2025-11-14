"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

function LoginForm() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端执行，避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 完全移除客户端重定向逻辑和 session 检查！
  // 让 NextAuth 和 middleware 处理所有重定向
  // 如果已认证，middleware 会允许访问，否则会重定向到登录页

  const handleGoogleLogin = async () => {
    if (!mounted) return; // 确保只在客户端执行
    
    try {
      setLoading(true);
      setError("");
      
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      
      // 使用 redirect: true 让 NextAuth 完全处理 OAuth 流程
      // NextAuth 会处理重定向，不需要我们手动处理
      await signIn("google", { 
        callbackUrl,
        redirect: true,
      });
      // 注意：signIn 会立即重定向到 Google，不会返回
    } catch (error: any) {
      console.error("Google login error:", error);
      
      if (error?.message?.includes("disallowed_useragent") || 
          error?.error === "disallowed_useragent") {
        setError("此瀏覽器不支援 Google 登入，請使用標準瀏覽器（Chrome、Firefox、Safari、Edge）");
      } else {
        setError("Google登入失敗，請稍後再試");
      }
      setLoading(false);
    }
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mounted) return; // 确保只在客户端执行
    
    if (!userId.trim()) {
      setError("請輸入User ID");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      const result = await signIn("credentials", {
        userId: userId.trim(),
        redirect: true, // 让 NextAuth 处理重定向
        callbackUrl,
      });

      // 如果 redirect: true，result 通常不会返回
      // 但如果返回了，说明有错误
      if (result?.error) {
        setError("登入失敗：找不到該User ID");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Test login error:", error);
      setError("登入失敗，請稍後再試");
      setLoading(false);
    }
  };

  // 如果还未挂载，显示加载状态（避免 hydration mismatch）
  if (!mounted) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>載入中...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // 显示登录表单
  // 如果已认证，middleware 会重定向到首页
  // 如果未认证，显示登录表单
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            登入
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading}
              sx={{ mb: 2, py: 1.5 }}
            >
              使用 Google 登入
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                或
              </Typography>
            </Divider>

            <form onSubmit={handleTestLogin}>
              <TextField
                fullWidth
                label="User ID"
                variant="outlined"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
                sx={{ mb: 2 }}
                placeholder="輸入測試用User ID"
                autoComplete="off"
              />
              <Button
                fullWidth
                type="submit"
                variant="outlined"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} /> : "測試登入"}
              </Button>
            </form>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mt: 2 }} 
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <Snackbar
            open={success}
            autoHideDuration={2000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert severity="success" onClose={() => setSuccess(false)}>
              登入成功！
            </Alert>
          </Snackbar>
        </Paper>
      </Box>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>載入中...</Typography>
            </Box>
          </Box>
        </Container>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
