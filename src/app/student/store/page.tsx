"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import StoreIcon from "@mui/icons-material/Store";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import RedeemIcon from "@mui/icons-material/Redeem";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InventoryIcon from "@mui/icons-material/Inventory";

// Draw cost will be fetched from API (kept for backward compatibility)
let DRAW_COST_POINTS = 0;

interface CatalogCoupon {
  couponId: string;
  name: string;
  shopName: string;
  branch: string | null;
  storeLocation: string;
  validFrom: string | null;
  validTo: string | null;
  valueDescription: string;
  description: string | null;
  picture: string | null;
  weight: number;
  probability: number; // 抽中機率（百分比）
  maxIssuance: number | null;
  issuedCount: number;
  remainingCount: number | null;
  isOutOfStock: boolean;
}

interface MyCoupon {
  id: string;
  couponId: string;
  name: string;
  shopName: string;
  branch: string | null;
  storeLocation: string;
  validFrom: string | null;
  validTo: string | null;
  valueDescription: string;
  description: string | null;
  picture: string | null;
  purchasedAt: string;
  status: "UNUSED" | "REDEEMING" | "REDEEMED" | "EXPIRED";
  redeemStartedAt: string | null;
  redeemExpiresAt: string | null;
  redeemedAt: string | null;
  quantity?: number; // 重複張數
  unusedQuantity?: number; // 未使用的張數
  redeemingQuantity?: number; // 兌換中的張數
  couponIds?: string[]; // 所有該優惠券的 ID 列表
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`coupon-tabpanel-${index}`}
      aria-labelledby={`coupon-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function StudentStorePage() {
  const { data: session } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [catalogCoupons, setCatalogCoupons] = useState<CatalogCoupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<MyCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [drawCostPoints, setDrawCostPoints] = useState<number>(0);
  const [drawing, setDrawing] = useState(false);
  const [drawDialogOpen, setDrawDialogOpen] = useState(false);
  const [drawResultDialogOpen, setDrawResultDialogOpen] = useState(false);
  const [awardedCoupon, setAwardedCoupon] = useState<any | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedMyCoupon, setSelectedMyCoupon] = useState<MyCoupon | null>(null);
  const [countdownView, setCountdownView] = useState(false);
  const [countdownExpiresAt, setCountdownExpiresAt] = useState<string | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [startingRedemption, setStartingRedemption] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch student points balance and draw cost
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.userId) return;
      try {
        // Fetch points balance
        const pointsResponse = await fetch("/api/student/points");
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPointsBalance(pointsData.pointsBalance || 0);
        }
        
        // Fetch draw cost
        const costResponse = await fetch("/api/admin/draw-cost");
        if (costResponse.ok) {
          const costData = await costResponse.json();
          const cost = costData.drawCostPoints || 0;
          DRAW_COST_POINTS = cost;
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [session]);

  // Fetch catalog coupons
  useEffect(() => {
    const fetchCatalog = async () => {
      if (!session?.userId) return;
      try {
        setLoading(true);
        const response = await fetch("/api/coupons/catalog");
        if (response.ok) {
          const data = await response.json();
          setCatalogCoupons(data.coupons || []);
        }
      } catch (error) {
        console.error("Error fetching catalog:", error);
        setCatalogCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [session]);

  // Fetch my coupons
  useEffect(() => {
    const fetchMyCoupons = async () => {
      if (!session?.userId) return;
      try {
        const response = await fetch("/api/student/coupons/mine");
        if (response.ok) {
          const data = await response.json();
          setMyCoupons(data.coupons || []);
        }
      } catch (error) {
        console.error("Error fetching my coupons:", error);
        setMyCoupons([]);
      }
    };
    fetchMyCoupons();
  }, [session]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle draw button click
  const handleDrawClick = () => {
    if (pointsBalance === null || pointsBalance < DRAW_COST_POINTS) {
      setSnackbar({
        open: true,
        message: `點數不足，需要 ${DRAW_COST_POINTS} 點`,
        severity: "error",
      });
      return;
    }
    setDrawDialogOpen(true);
  };

  // Confirm draw
  const handleDrawConfirm = async () => {
    try {
      setDrawing(true);
      const response = await fetch("/api/coupons/draw", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setAwardedCoupon(data.awardedCoupon);
        setPointsBalance(data.remainingPoints);
        setDrawDialogOpen(false);
        setDrawResultDialogOpen(true);
        // Refresh my coupons
        const myCouponsResponse = await fetch("/api/student/coupons/mine");
        if (myCouponsResponse.ok) {
          const myCouponsData = await myCouponsResponse.json();
          setMyCoupons(myCouponsData.coupons || []);
        }
        // Refresh catalog to update stock
        const catalogResponse = await fetch("/api/coupons/catalog");
        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json();
          setCatalogCoupons(catalogData.coupons || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSnackbar({
          open: true,
          message: errorData.error || "抽獎失敗",
          severity: "error",
        });
        setDrawDialogOpen(false);
      }
    } catch (error) {
      console.error("Error performing draw:", error);
      setSnackbar({
        open: true,
        message: "抽獎失敗",
        severity: "error",
      });
      setDrawDialogOpen(false);
    } finally {
      setDrawing(false);
    }
  };

  // Start redemption flow - show staff confirmation
  const handleStartRedeem = (coupon: MyCoupon) => {
    // Check if there are any UNUSED coupons available
    if (coupon.quantity && coupon.unusedQuantity !== undefined && coupon.unusedQuantity <= 0) {
      setSnackbar({
        open: true,
        message: "沒有可兌換的優惠券",
        severity: "error",
      });
      return;
    }
    if (coupon.status !== "UNUSED" && (!coupon.quantity || coupon.unusedQuantity === 0)) {
      return;
    }
    setSelectedMyCoupon(coupon);
    setRedeemDialogOpen(true);
  };

  // Staff confirms redemption - call API to start redemption
  const handleConfirmRedeem = async () => {
    if (!selectedMyCoupon) return;

    try {
      setStartingRedemption(true);
      // Use couponId instead of id for grouped coupons
      const couponId = selectedMyCoupon.couponId;
      const response = await fetch(
        `/api/student/coupons/mine/redeem/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ couponId }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRedeemDialogOpen(false);
        setCountdownExpiresAt(data.redeemExpiresAt);
        setCountdownView(true);
        updateCountdown(data.redeemExpiresAt);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSnackbar({
          open: true,
          message: errorData.error || "開始兌換失敗",
          severity: "error",
        });
        setRedeemDialogOpen(false);
      }
    } catch (error) {
      console.error("Error starting redemption:", error);
      setSnackbar({
        open: true,
        message: "開始兌換失敗",
        severity: "error",
      });
      setRedeemDialogOpen(false);
    } finally {
      setStartingRedemption(false);
    }
  };

  // Update countdown based on server time
  const updateCountdown = (expiresAt: string) => {
    const update = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));

      setCountdownRemaining(remaining);

      if (remaining <= 0) {
        setCountdownView(false);
        setCountdownExpiresAt(null);
        setCountdownRemaining(null);
        const fetchMyCoupons = async () => {
          try {
            const response = await fetch("/api/student/coupons/mine");
            if (response.ok) {
              const data = await response.json();
              setMyCoupons(data.coupons || []);
            }
          } catch (error) {
            console.error("Error refreshing coupons:", error);
          }
        };
        fetchMyCoupons();
      } else {
        setTimeout(update, 1000);
      }
    };
    update();
  };

  // Check for existing redemption countdown on mount or when tab changes
  useEffect(() => {
    if (tabValue === 2 && myCoupons.length > 0 && !countdownView) {
      const redeemingCoupon = myCoupons.find((c) => c.status === "REDEEMING" && c.redeemExpiresAt);
      if (redeemingCoupon && redeemingCoupon.redeemExpiresAt) {
        setSelectedMyCoupon(redeemingCoupon);
        setCountdownExpiresAt(redeemingCoupon.redeemExpiresAt);
        setCountdownView(true);
        updateCountdown(redeemingCoupon.redeemExpiresAt);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, myCoupons]);

  const getStatusChip = (status: string) => {
    switch (status) {
      case "UNUSED":
        return <Chip label="未使用" color="success" size="small" />;
      case "REDEEMING":
        return <Chip label="兌換中" color="warning" size="small" />;
      case "REDEEMED":
        return <Chip label="已兌換" color="default" size="small" />;
      case "EXPIRED":
        return <Chip label="已過期" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Check if draw is possible
  const canDraw = () => {
    // If cost is 0, only check if eligible coupons exist
    if (DRAW_COST_POINTS === 0) {
      const eligibleCount = catalogCoupons.filter((c) => !c.isOutOfStock).length;
      return eligibleCount > 0;
    }
    // Otherwise check points balance
    if (pointsBalance === null) return false;
    if (pointsBalance < DRAW_COST_POINTS) return false;
    // Check if any eligible coupons exist
    const eligibleCount = catalogCoupons.filter((c) => !c.isOutOfStock).length;
    return eligibleCount > 0;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">點數兌換</Typography>
        {pointsBalance !== null && (
          <Paper sx={{ p: 2, bgcolor: "primary.light", color: "primary.contrastText" }}>
            <Typography variant="h6">
              目前點數: <strong>{pointsBalance}</strong> 點
            </Typography>
          </Paper>
        )}
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="coupon tabs">
          <Tab label="抽獎" icon={<CasinoIcon />} iconPosition="start" />
          <Tab label="優惠券目錄" icon={<StoreIcon />} iconPosition="start" />
          <Tab label="我的優惠券" icon={<StoreIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Draw Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 4 }}>
          <Paper sx={{ p: 4, maxWidth: 500, width: "100%", textAlign: "center" }}>
            <CasinoIcon sx={{ fontSize: 80, color: "primary.main", mb: 2 }} />
            <Typography variant="h4" sx={{ mb: 2 }}>
              優惠券抽獎
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              每次抽獎 {DRAW_COST_POINTS} 點
            </Typography>
            {DRAW_COST_POINTS === 0 && (
              <Alert severity="info" sx={{ mb: 4 }}>
                目前免費抽獎！
              </Alert>
            )}
            {pointsBalance !== null && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                目前點數: <strong>{pointsBalance}</strong> 點
              </Typography>
            )}
            <Button
              variant="contained"
              size="large"
              startIcon={<CasinoIcon />}
              onClick={handleDrawClick}
              disabled={!canDraw() || drawing}
              sx={{ minWidth: 200, py: 1.5 }}
            >
              {drawing ? <CircularProgress size={24} /> : "抽一次"}
            </Button>
            {!canDraw() && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                {DRAW_COST_POINTS > 0 && pointsBalance !== null && pointsBalance < DRAW_COST_POINTS
                  ? `點數不足，需要 ${DRAW_COST_POINTS} 點`
                  : "目前沒有可抽獎的優惠券"}
              </Alert>
            )}
          </Paper>
        </Box>
      </TabPanel>

      {/* Catalog Tab */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : catalogCoupons.length === 0 ? (
          <Alert severity="info">目前沒有優惠券</Alert>
        ) : (
          <Grid container spacing={3}>
            {catalogCoupons.map((coupon) => (
              <Grid item xs={12} sm={6} md={4} key={coupon.couponId}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  {coupon.picture && (
                    <CardMedia
                      component="img"
                      image={coupon.picture}
                      alt={coupon.name}
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "300px",
                        objectFit: "contain",
                        bgcolor: "grey.50",
                      }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {coupon.name}
                      </Typography>
                      {coupon.isOutOfStock ? (
                        <Chip label="已售完" color="error" size="small" />
                      ) : (
                        <Chip label="可抽獎" color="success" size="small" />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <StoreIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.storeLocation}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <CalendarTodayIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.validFrom && coupon.validTo
                          ? `${coupon.validFrom.split("T")[0]} ~ ${coupon.validTo.split("T")[0]}`
                          : "無期限"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <AttachMoneyIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.valueDescription}
                      </Typography>
                    </Box>
                    {coupon.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {coupon.description}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", mt: 2, mb: 1 }}>
                      <InventoryIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.maxIssuance !== null
                          ? `剩餘: ${coupon.remainingCount} / ${coupon.maxIssuance}`
                          : "無限制"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip
                        label={`抽中機率: ${coupon.probability.toFixed(2)}%`}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* My Coupons Tab */}
      <TabPanel value={tabValue} index={2}>
        {countdownView && selectedMyCoupon ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              p: 4,
            }}
          >
            <Paper sx={{ p: 4, maxWidth: 500, width: "100%", textAlign: "center" }}>
              <AccessTimeIcon sx={{ fontSize: 80, color: "primary.main", mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 2 }}>
                兌換中
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                {selectedMyCoupon.name}
              </Typography>
              {countdownRemaining !== null && (
                <>
                  <Typography variant="h2" color="primary" sx={{ mb: 2, fontFamily: "monospace" }}>
                    {Math.floor(countdownRemaining / 60)}:{(countdownRemaining % 60).toString().padStart(2, "0")}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    請勿離開畫面
                  </Typography>
                </>
              )}
              <Alert severity="info" sx={{ mt: 2 }}>
                兌換完成後，此優惠券將從列表中移除
              </Alert>
            </Paper>
          </Box>
        ) : loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : myCoupons.length === 0 ? (
          <Alert severity="info">您還沒有抽到任何優惠券</Alert>
        ) : (
          <Grid container spacing={3}>
            {myCoupons.map((coupon) => (
              <Grid item xs={12} sm={6} md={4} key={coupon.id}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  {coupon.picture && (
                    <CardMedia
                      component="img"
                      image={coupon.picture}
                      alt={coupon.name}
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "300px",
                        objectFit: "contain",
                        bgcolor: "grey.50",
                      }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="h6" component="div">
                          {coupon.name}
                        </Typography>
                        {coupon.quantity && coupon.quantity > 1 && (
                          <Chip
                            label={`x${coupon.quantity}`}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      {getStatusChip(coupon.status)}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <StoreIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.storeLocation}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <CalendarTodayIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.validFrom && coupon.validTo
                          ? `${coupon.validFrom.split("T")[0]} ~ ${coupon.validTo.split("T")[0]}`
                          : "無期限"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <AttachMoneyIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {coupon.valueDescription}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      獲得時間: {new Date(coupon.purchasedAt).toLocaleString("zh-TW")}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {coupon.unusedQuantity !== undefined && coupon.unusedQuantity > 0 ? (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<RedeemIcon />}
                        onClick={() => handleStartRedeem(coupon)}
                      >
                        兌換
                      </Button>
                    ) : coupon.redeemingQuantity !== undefined && coupon.redeemingQuantity > 0 ? (
                      <Button fullWidth variant="outlined" disabled startIcon={<AccessTimeIcon />}>
                        兌換中
                      </Button>
                    ) : (
                      <Button fullWidth variant="outlined" disabled>
                        {coupon.status === "EXPIRED" ? "已過期" : "已兌換"}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Draw Confirmation Dialog */}
      <Dialog open={drawDialogOpen} onClose={() => !drawing && setDrawDialogOpen(false)}>
        <DialogTitle>確認抽獎</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {DRAW_COST_POINTS === 0
              ? "您確定要進行免費抽獎嗎？"
              : `您確定要花費 ${DRAW_COST_POINTS} 點進行抽獎嗎？`}
          </DialogContentText>
          {DRAW_COST_POINTS > 0 && pointsBalance !== null && (
            <Typography variant="body2" color="text.secondary">
              抽獎後剩餘點數: {pointsBalance - DRAW_COST_POINTS} 點
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawDialogOpen(false)} disabled={drawing}>
            取消
          </Button>
          <Button onClick={handleDrawConfirm} variant="contained" disabled={drawing}>
            {drawing ? <CircularProgress size={20} /> : "確認抽獎"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Draw Result Dialog */}
      <Dialog open={drawResultDialogOpen} onClose={() => setDrawResultDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>抽獎結果</DialogTitle>
        <DialogContent>
          {awardedCoupon && (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                恭喜您抽中了！
              </Alert>
              <Paper sx={{ p: 3, bgcolor: "grey.50", mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {awardedCoupon.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {awardedCoupon.storeLocation}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {awardedCoupon.valueDescription}
                </Typography>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawResultDialogOpen(false)} variant="contained">
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Confirmation Dialog */}
      <Dialog open={redeemDialogOpen} onClose={() => !startingRedemption && setRedeemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>確認兌換通知</DialogTitle>
        <DialogContent>
          {selectedMyCoupon && (
            <>
              <DialogContentText sx={{ mb: 3 }}>
                請向店員出示此畫面，由店員按下「確認」按鈕開始兌換流程。
              </DialogContentText>
              <Paper sx={{ p: 3, bgcolor: "grey.50", mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {selectedMyCoupon.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {selectedMyCoupon.storeLocation}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMyCoupon.valueDescription}
                </Typography>
              </Paper>
              <Alert severity="info" sx={{ mt: 2 }}>
                確認後將開始 5 分鐘倒計時，請勿離開畫面
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemDialogOpen(false)} disabled={startingRedemption}>
            取消
          </Button>
          <Button onClick={handleConfirmRedeem} variant="contained" disabled={startingRedemption}>
            {startingRedemption ? <CircularProgress size={20} /> : "確認"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
