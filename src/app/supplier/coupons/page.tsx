"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardMedia,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import PublishIcon from "@mui/icons-material/Publish";

interface Coupon {
  couponId: string;
  name: string;
  shopName?: string;
  branch?: string;
  description?: string;
  discountType?: string;
  discountAmount?: number;
  discountPercentage?: number;
  minimumOrderAmount?: number;
  requiredPoints?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  period: string;
  link?: string;
  picture?: string;
  maxIssuance?: number | null;
  issuedCount?: number;
  createdAt: string;
}

export default function SupplierCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/supplier/coupons");
      if (response.ok) {
        const data = await response.json();
        setCoupons(data.coupons || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "載入優惠券失敗");
      }
    } catch (err: any) {
      console.error("Error fetching coupons:", err);
      setError("載入優惠券失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setViewDialogOpen(true);
  };

  const handlePublish = async (couponId: string) => {
    if (!confirm("確定要發布此優惠券嗎？發布後學生就可以看到並兌換此優惠券。")) return;

    try {
      const response = await fetch(`/api/supplier/coupons/${couponId}/publish`, {
        method: "POST",
      });
      if (response.ok) {
        fetchCoupons();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "發布優惠券失敗");
      }
    } catch (error) {
      console.error("Error publishing coupon:", error);
      setError("發布優惠券失敗");
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("確定要刪除此優惠券嗎？此操作無法復原。")) return;

    try {
      const response = await fetch(`/api/supplier/coupons/${couponId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCoupons();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "刪除優惠券失敗");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      setError("刪除優惠券失敗");
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "warning";
      case "disabled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "啟用";
      case "draft":
        return "草稿";
      case "disabled":
        return "停用";
      default:
        return "未知";
    }
  };

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discountType === "threshold_amount_off") {
      return `滿 ${coupon.minimumOrderAmount} 元折 ${coupon.discountAmount} 元`;
    } else if (coupon.discountType === "amount_off") {
      return `折 ${coupon.discountAmount} 元`;
    } else if (coupon.discountType === "percentage") {
      const zheValue = (coupon.discountPercentage || 0) / 10;
      return `全單 ${zheValue} 折`;
    }
    return "未知折扣";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">優惠券管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/supplier/coupons/new")}
        >
          新增優惠券
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {coupons.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            目前還沒有優惠券
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push("/supplier/coupons/new")}
          >
            建立第一個優惠券
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {coupons.map((coupon) => (
            <Grid item xs={12} md={6} lg={4} key={coupon.couponId}>
              <Card>
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
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {coupon.name}
                    </Typography>
                    <Chip
                      label={getStatusLabel(coupon.status)}
                      color={getStatusColor(coupon.status) as any}
                      size="small"
                    />
                  </Box>
                  {coupon.shopName && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {coupon.shopName}
                      {coupon.branch && ` - ${coupon.branch}`}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {getDiscountText(coupon)}
                  </Typography>
                  {coupon.requiredPoints && (
                    <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                      需要 {coupon.requiredPoints} 點
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    有效至: {new Date(coupon.period).toLocaleDateString()}
                  </Typography>
                  {coupon.maxIssuance !== null && coupon.maxIssuance !== undefined && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      剩餘張數: {Math.max(0, (coupon.maxIssuance || 0) - (coupon.issuedCount || 0))} / {coupon.maxIssuance}
                    </Typography>
                  )}
                  {coupon.maxIssuance === null && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      剩餘張數: 無限制
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleView(coupon)}
                    >
                      查看
                    </Button>
                    {coupon.status === "draft" && (
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        startIcon={<PublishIcon />}
                        onClick={() => handlePublish(coupon.couponId)}
                      >
                        發布
                      </Button>
                    )}
                    {(coupon.status === "active" || coupon.status === "disabled") && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(coupon.couponId)}
                      >
                        刪除
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 查看優惠券詳情對話框 */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>優惠券詳情</DialogTitle>
        <DialogContent>
          {selectedCoupon && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedCoupon.name}
              </Typography>
              {selectedCoupon.shopName && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>店家:</strong> {selectedCoupon.shopName}
                  {selectedCoupon.branch && ` - ${selectedCoupon.branch}`}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>折扣:</strong> {getDiscountText(selectedCoupon)}
              </Typography>
              {selectedCoupon.description && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>描述:</strong> {selectedCoupon.description}
                </Typography>
              )}
              {selectedCoupon.requiredPoints && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>所需點數:</strong> {selectedCoupon.requiredPoints} 點
                </Typography>
              )}
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>有效期間:</strong>{" "}
                {selectedCoupon.startDate && selectedCoupon.endDate
                  ? `${new Date(selectedCoupon.startDate).toLocaleDateString()} 至 ${new Date(selectedCoupon.endDate).toLocaleDateString()}`
                  : `至 ${new Date(selectedCoupon.period).toLocaleDateString()}`}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>狀態:</strong>{" "}
                <Chip
                  label={getStatusLabel(selectedCoupon.status)}
                  color={getStatusColor(selectedCoupon.status) as any}
                  size="small"
                />
              </Typography>
              {selectedCoupon.maxIssuance !== null && selectedCoupon.maxIssuance !== undefined && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>剩餘張數:</strong> {Math.max(0, (selectedCoupon.maxIssuance || 0) - (selectedCoupon.issuedCount || 0))} / {selectedCoupon.maxIssuance}
                </Typography>
              )}
              {selectedCoupon.maxIssuance === null && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>剩餘張數:</strong> 無限制
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

