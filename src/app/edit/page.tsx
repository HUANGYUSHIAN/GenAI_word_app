"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import StoreIcon from "@mui/icons-material/Store";
import HomeIcon from "@mui/icons-material/Home";

function EditContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 如果未登入，重定向到登入頁
    if (mounted && status === "unauthenticated") {
      router.push("/login");
    }
    // 如果已登入但已有身分，重定向到首頁
    if (mounted && status === "authenticated" && session?.userId) {
      checkUserType();
      // 顯示歡迎訊息（新用戶）
      if (typeof window !== "undefined") {
        const fromLogin = 
          (document.referrer && document.referrer.includes("/login")) || 
          window.location.search.includes("callbackUrl") ||
          window.location.search.includes("code=");
        if (fromLogin) {
          setShowWelcome(true);
        }
      }
    }
  }, [mounted, status, session, router]);

  const checkUserType = async () => {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const userData = await response.json();
        if (userData.dataType) {
          // 已有身分，重定向到對應頁面
          if (userData.dataType === "Student") {
            router.push("/student");
          } else if (userData.dataType === "Supplier") {
            router.push("/supplier");
          } else if (userData.dataType === "Admin") {
            router.push("/admin");
          } else {
            router.push("/");
          }
        }
      }
    } catch (error) {
      console.error("Error checking user type:", error);
    }
  };

  const handleSelectRole = async (role: "Student" | "Supplier") => {
    if (!session?.userId) {
      setError("請先登入");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/select-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        // 成功選擇身分，重定向到對應頁面
        if (role === "Student") {
          router.push("/student");
        } else {
          router.push("/supplier");
        }
      } else {
        const data = await response.json();
        setError(data.error || "選擇身分失敗，請稍後再試");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error selecting role:", error);
      setError("選擇身分失敗，請稍後再試");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // 取消選擇，登出並清除資料
    router.push("/login");
  };

  if (!mounted || status === "loading") {
    return (
      <Container>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 600 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h4" component="h1">
              選擇您的身分
            </Typography>
            <Button
              startIcon={<HomeIcon />}
              onClick={handleCancel}
              variant="outlined"
              disabled={loading}
            >
              取消
            </Button>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            請選擇您的身分以繼續使用服務。如果現在不選擇，您可以稍後再登入選擇。
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", sm: "row" } }}>
            <Card
              sx={{
                flex: 1,
                cursor: loading ? "default" : "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": loading
                  ? {}
                  : {
                      transform: "translateY(-4px)",
                      boxShadow: 6,
                    },
              }}
              onClick={() => !loading && handleSelectRole("Student")}
            >
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <SchoolIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
                <Typography variant="h5" component="h2" gutterBottom>
                  學生
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  使用單字本學習、參與遊戲、複習單字等功能
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleSelectRole("Student")}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <SchoolIcon />}
                >
                  選擇學生
                </Button>
              </CardActions>
            </Card>

            <Card
              sx={{
                flex: 1,
                cursor: loading ? "default" : "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": loading
                  ? {}
                  : {
                      transform: "translateY(-4px)",
                      boxShadow: 6,
                    },
              }}
              onClick={() => !loading && handleSelectRole("Supplier")}
            >
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <StoreIcon sx={{ fontSize: 60, color: "secondary.main", mb: 2 }} />
                <Typography variant="h5" component="h2" gutterBottom>
                  廠商
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理優惠券、店鋪資訊、查看評分與回饋等功能
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 3 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  onClick={() => handleSelectRole("Supplier")}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <StoreIcon />}
                >
                  選擇廠商
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar
        open={showWelcome}
        autoHideDuration={3000}
        onClose={() => setShowWelcome(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowWelcome(false)}>
          歡迎新加入！請選擇您的身分
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default function EditPage() {
  return (
    <Suspense
      fallback={
        <Container>
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        </Container>
      }
    >
      <EditContent />
    </Suspense>
  );
}

