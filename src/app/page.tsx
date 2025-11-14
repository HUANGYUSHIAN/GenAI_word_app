"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  AppBar,
  Toolbar,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import SchoolIcon from "@mui/icons-material/School";
import StoreIcon from "@mui/icons-material/Store";

interface UserInfo {
  userId: string;
  googleId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  dataType: string | null;
}

function HomeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("登入成功！歡迎回來");
  const [hasShownSuccess, setHasShownSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingRole, setSelectingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  // 从数据库获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (status === "authenticated" && session?.userId) {
        try {
          setLoading(true);
          const response = await fetch("/api/user");
          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
            
            // 檢查是否為管理員，如果是則重定向到 /admin
            if (data.dataType === "Admin") {
              console.log("[Home] Admin user detected, redirecting to /admin");
              router.push("/admin");
              return;
            }
            
            // 如果 dataType 為 null，顯示角色選擇介面
            if (!data.dataType) {
              console.log("[Home] New user without dataType, showing role selection");
              // 不返回，繼續顯示角色選擇介面
            } else {
              // 已有角色，根據角色導向對應頁面
              if (data.dataType === "Student") {
                console.log("[Home] Student user detected, redirecting to /student");
                router.push("/student");
                return;
              } else if (data.dataType === "Supplier") {
                console.log("[Home] Supplier user detected, redirecting to /supplier");
                router.push("/supplier");
                return;
              }
            }
            
            // 检查是否是从登录页面跳转过来的，显示成功提示
            // 只在客户端执行，避免 hydration mismatch
            if (typeof window !== "undefined" && !hasShownSuccess) {
              // 检查来源：登录页面或 OAuth 回调
              const fromLogin = 
                (document.referrer && document.referrer.includes("/login")) || 
                window.location.search.includes("callbackUrl") ||
                window.location.search.includes("code=");
              
              if (fromLogin) {
                // 檢查是否為新用戶（通過檢查 dataType 是否為 null）
                const isNewUser = !data.dataType;
                setSuccessMessage(isNewUser ? "歡迎新加入！" : "歡迎回來！");
                setShowSuccess(true);
                setHasShownSuccess(true);
                // 清除URL参数
                const url = new URL(window.location.href);
                if (url.search) {
                  url.search = "";
                  window.history.replaceState({}, "", url.toString());
                }
              }
            }
          } else {
            // 檢查是否需要清除 session
            const data = await response.json().catch(() => ({}));
            
            // 只有在明確標記 clearSession: true 且是 404（找不到用戶）時才清除 session
            // 401（未登入）和 403（帳號鎖定）也需要清除
            // 但 503（服務不可用）和 500（伺服器錯誤）不應該清除 session
            if (data.clearSession && (response.status === 401 || response.status === 404 || response.status === 403)) {
              // 確認資料庫中真的沒有用戶，才清除 session
              console.log("Clearing session due to:", response.status, data);
              await signOut({ callbackUrl: "/login", redirect: true });
              return;
            }
            
            // 如果是暫時的錯誤（503），不應該清除 session
            if (response.status === 503) {
              console.warn("Database temporarily unavailable, keeping session");
              // 可以顯示錯誤提示，但不清除 session
              return;
            }
            
            console.error("Failed to fetch user info:", response.status, response.statusText);
          }
        } catch (error) {
          console.error("Failed to fetch user info:", error);
          // 網絡錯誤或其他錯誤，不應該立即清除 session
          // 可能是暫時的網絡問題或資料庫連接問題
          // 只有在確認是認證問題時才清除 session
        } finally {
          setLoading(false);
        }
      } else if (status === "authenticated" && !session?.userId) {
        // 如果已认证但没有 userId，说明 session 无效，重定向到登录页
        router.push("/login");
      }
    };

    if (status === "authenticated") {
      fetchUserInfo();
    }
  }, [status, session?.userId, hasShownSuccess, router]);

  useEffect(() => {
    // 只有在明确未认证时才重定向，避免在 loading 状态时误判
    // 添加延迟避免在 session 检查时立即重定向
    if (status === "unauthenticated" && !loading) {
      // 延迟一下，确保不是 session 建立过程中的临时状态
      const timer = setTimeout(() => {
        // 再次确认状态
        if (status === "unauthenticated") {
          router.push("/login");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status, loading, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleSelectRole = async (role: "Student" | "Supplier") => {
    if (!session?.userId) {
      setRoleError("請先登入");
      return;
    }

    setSelectingRole(true);
    setRoleError("");

    try {
      const response = await fetch("/api/user/select-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        // 成功選擇身分，強制登出
        console.log("[Home] Role selected successfully, signing out...");
        await signOut({ callbackUrl: "/login", redirect: true });
      } else {
        const data = await response.json();
        setRoleError(data.error || "選擇身分失敗，請稍後再試");
        setSelectingRole(false);
      }
    } catch (error: any) {
      console.error("Error selecting role:", error);
      setRoleError("選擇身分失敗，請稍後再試");
      setSelectingRole(false);
    }
  };

  if (status === "loading" || loading) {
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
          <Typography>載入中...</Typography>
        </Box>
      </Container>
    );
  }

  // 如果未认证或没有用户信息，显示加载状态而不是 null（避免 hydration mismatch）
  if (!session || !userInfo) {
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
          <Typography>載入中...</Typography>
        </Box>
      </Container>
    );
  }

  // 如果 dataType 為 null，顯示角色選擇介面
  if (!userInfo.dataType) {
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
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 2 }}>
              選擇您的身分
            </Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              請注意：選擇後將無法更改，請謹慎選擇。
            </Alert>

            {roleError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setRoleError("")}>
                {roleError}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", sm: "row" } }}>
              <Card
                sx={{
                  flex: 1,
                  cursor: selectingRole ? "default" : "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": selectingRole
                    ? {}
                    : {
                        transform: "translateY(-4px)",
                        boxShadow: 6,
                      },
                }}
                onClick={() => !selectingRole && handleSelectRole("Student")}
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
                    disabled={selectingRole}
                    startIcon={selectingRole ? <CircularProgress size={20} /> : <SchoolIcon />}
                  >
                    選擇學生
                  </Button>
                </CardActions>
              </Card>

              <Card
                sx={{
                  flex: 1,
                  cursor: selectingRole ? "default" : "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": selectingRole
                    ? {}
                    : {
                        transform: "translateY(-4px)",
                        boxShadow: 6,
                      },
                }}
                onClick={() => !selectingRole && handleSelectRole("Supplier")}
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
                    disabled={selectingRole}
                    startIcon={selectingRole ? <CircularProgress size={20} /> : <StoreIcon />}
                  >
                    選擇廠商
                  </Button>
                </CardActions>
              </Card>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            OAuth App
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            登出
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {userInfo.image && (
              <Avatar
                src={userInfo.image}
                alt={userInfo.name || "User"}
                sx={{ width: 80, height: 80, mb: 2 }}
              />
            )}
            <Typography variant="h3" component="h1" gutterBottom>
              歡迎 {userInfo.name || "使用者"} 登入
            </Typography>
            {userInfo.email && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {userInfo.email}
              </Typography>
            )}
            {userInfo.userId && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                網站 User ID: {userInfo.userId}
              </Typography>
            )}
            {userInfo.googleId && (
              <Typography variant="body2" color="text.secondary">
                Google ID: {userInfo.googleId}
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <Container>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography>載入中...</Typography>
        </Box>
      </Container>
    }>
      <HomeContent />
    </Suspense>
  );
}
