"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StoreIcon from "@mui/icons-material/Store";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { signOut } from "next-auth/react";

const drawerWidth = 240;

const menuItems = [
  { text: "設定", icon: <SettingsIcon />, path: "/supplier/setting" },
  { text: "優惠券管理", icon: <LocalOfferIcon />, path: "/supplier/coupon" },
  { text: "店鋪資訊", icon: <StoreIcon />, path: "/supplier/store" },
];

function SupplierLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSupplier, setIsSupplier] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && status === "authenticated" && session?.userId) {
      checkSupplierStatus();
    } else if (mounted && status === "unauthenticated") {
      router.push("/login");
    }
  }, [mounted, status, session, router]);

  const checkSupplierStatus = async () => {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const userData = await response.json();
        if (userData.dataType === "Supplier") {
          setIsSupplier(true);
        } else {
          router.push("/");
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
          return;
        }
        
        router.push("/login");
      }
    } catch (error) {
      console.error("Error checking supplier status:", error);
      // 網絡錯誤或其他錯誤，不應該立即清除 session
      // 可能是暫時的網絡問題或資料庫連接問題
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  if (!mounted || loading || status === "loading") {
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

  if (status === "unauthenticated" || !isSupplier) {
    return null;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            廠商專區
          </Typography>
          <Button
            color="inherit"
            startIcon={<HomeIcon />}
            onClick={() => router.push("/supplier")}
            sx={{ mr: 2 }}
          >
            首頁
          </Button>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            登出
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  onClick={() => router.push(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
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
      }
    >
      <SupplierLayoutContent>{children}</SupplierLayoutContent>
    </Suspense>
  );
}

