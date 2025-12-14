"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import ImageUpload from "@/components/ImageUpload";

interface Coupon {
  couponId: string;
  name: string;
  period: string;
  link: string | null;
  text: string | null;
  picture: string | null;
  createdAt: string;
}

interface CouponFormData {
  shopName: string;
  couponName: string;
  description: string;
  discountType: "threshold_amount_off" | "amount_off" | "percentage";
  minimumOrderAmount: number | null;
  discountAmount: number | null;
  discountPercentage: number | null;
  startDate: string;
  endDate: string;
  totalQuantity: number | null;
  perUserLimit: number | null;
  perDayLimit: number | null;
  branch: string;
  picture: string;
}

export default function AdminCouponPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openDrawCostDialog, setOpenDrawCostDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [drawCostPoints, setDrawCostPoints] = useState<number>(0);
  const [drawCostInput, setDrawCostInput] = useState<string>("0");
  const [savingDrawCost, setSavingDrawCost] = useState(false);
  const [formData, setFormData] = useState<CouponFormData>({
    shopName: "",
    couponName: "",
    description: "",
    discountType: "threshold_amount_off",
    minimumOrderAmount: null,
    discountAmount: null,
    discountPercentage: null,
    startDate: "",
    endDate: "",
    totalQuantity: null,
    perUserLimit: null,
    perDayLimit: null,
    branch: "",
    picture: "",
  });

  useEffect(() => {
    fetchCoupons();
    fetchDrawCost();
  }, [page, rowsPerPage]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/coupons?page=${page}&limit=${rowsPerPage}`
      );
      if (response.ok) {
        const data = await response.json();
        setCoupons(data.coupons || []);
        setTotal(data.total || 0);
      } else {
        setError("載入優惠券資料失敗");
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
      setError("載入優惠券資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawCost = async () => {
    try {
      const response = await fetch("/api/admin/draw-cost");
      if (response.ok) {
        const data = await response.json();
        setDrawCostPoints(data.drawCostPoints || 0);
        setDrawCostInput(String(data.drawCostPoints || 0));
      }
    } catch (error) {
      console.error("Error fetching draw cost:", error);
    }
  };

  const handleView = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setOpenViewDialog(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    // Parse coupon data from text field
    let couponData: any = {};
    try {
      if (coupon.text) {
        couponData = JSON.parse(coupon.text);
      }
    } catch (e) {
      console.error("Error parsing coupon data:", e);
    }

    setFormData({
      shopName: couponData.shopName || "",
      couponName: coupon.name,
      description: couponData.description || "",
      discountType: couponData.discountType || "threshold_amount_off",
      minimumOrderAmount: couponData.minimumOrderAmount || null,
      discountAmount: couponData.discountAmount || null,
      discountPercentage: couponData.discountPercentage || null,
      startDate: couponData.startDate || "",
      endDate: couponData.endDate || "",
      totalQuantity: couponData.totalQuantity || null,
      perUserLimit: couponData.perUserLimit || null,
      perDayLimit: couponData.perDayLimit || null,
      branch: couponData.branch || "",
      picture: coupon.picture || "", // 從 coupon.picture 讀取圖片 URL
    });
    setOpenDialog(true);
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("確定要刪除此優惠券嗎？")) return;

    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCoupons();
      } else {
        setError("刪除優惠券失敗");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      setError("刪除優惠券失敗");
    }
  };

  const handleSave = async () => {
    if (!selectedCoupon) return;

    try {
      const response = await fetch(
        `/api/admin/coupons/${selectedCoupon.couponId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (response.ok) {
        setOpenDialog(false);
        fetchCoupons();
      } else {
        setError("更新優惠券失敗");
      }
    } catch (error) {
      console.error("Error updating coupon:", error);
      setError("更新優惠券失敗");
    }
  };

  const handleAdd = () => {
    setSelectedCoupon(null);
    setFormData({
      shopName: "",
      couponName: "",
      description: "",
      discountType: "threshold_amount_off",
      minimumOrderAmount: null,
      discountAmount: null,
      discountPercentage: null,
      startDate: "",
      endDate: "",
      totalQuantity: null,
      perUserLimit: null,
      perDayLimit: null,
      branch: "",
      picture: "",
    });
    setOpenDialog(true);
  };

  const handleAddSave = async () => {
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setOpenDialog(false);
        fetchCoupons();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "新增優惠券失敗");
      }
    } catch (error) {
      console.error("Error adding coupon:", error);
      setError("新增優惠券失敗");
    }
  };

  const handleSaveDrawCost = async () => {
    const cost = parseInt(drawCostInput, 10);
    if (isNaN(cost) || cost < 0) {
      setError("點數必須是非負整數");
      return;
    }

    try {
      setSavingDrawCost(true);
      const response = await fetch("/api/admin/draw-cost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawCostPoints: cost }),
      });
      if (response.ok) {
        setDrawCostPoints(cost);
        setOpenDrawCostDialog(false);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "更新抽獎點數失敗");
      }
    } catch (error) {
      console.error("Error updating draw cost:", error);
      setError("更新抽獎點數失敗");
    } finally {
      setSavingDrawCost(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">優惠券管理</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setOpenDrawCostDialog(true)}
          >
            設定抽獎點數
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            新增優惠券
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>優惠券ID</TableCell>
              <TableCell>名稱</TableCell>
              <TableCell>使用期限</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  沒有資料
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.couponId}>
                  <TableCell>{coupon.couponId}</TableCell>
                  <TableCell>{coupon.name}</TableCell>
                  <TableCell>
                    {new Date(coupon.period).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleView(coupon)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(coupon)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(coupon.couponId)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      {/* 查看對話框 */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>查看優惠券</DialogTitle>
        <DialogContent>
          {selectedCoupon && (
            <Box sx={{ pt: 2 }}>
              <Typography><strong>優惠券ID:</strong> {selectedCoupon.couponId}</Typography>
              <Typography><strong>名稱:</strong> {selectedCoupon.name}</Typography>
              <Typography><strong>使用期限:</strong> {new Date(selectedCoupon.period).toLocaleString()}</Typography>
              <Typography><strong>連結:</strong> {selectedCoupon.link || "-"}</Typography>
              <Typography><strong>內容:</strong> {selectedCoupon.text || "-"}</Typography>
              <Typography><strong>圖片:</strong> {selectedCoupon.picture || "-"}</Typography>
              <Typography><strong>建立時間:</strong> {new Date(selectedCoupon.createdAt).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 編輯/新增對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCoupon ? "編輯優惠券" : "新增優惠券"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="店家名稱 *"
                  fullWidth
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="優惠券名稱 *"
                  fullWidth
                  value={formData.couponName}
                  onChange={(e) => setFormData({ ...formData, couponName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="描述"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>折扣類型</InputLabel>
                  <Select
                    value={formData.discountType}
                    label="折扣類型"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as any,
                      })
                    }
                  >
                    <MenuItem value="threshold_amount_off">滿額折扣</MenuItem>
                    <MenuItem value="amount_off">固定金額折扣</MenuItem>
                    <MenuItem value="percentage">百分比折扣</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.discountType === "threshold_amount_off" && (
                <>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="最低消費金額"
                      type="number"
                      fullWidth
                      value={formData.minimumOrderAmount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minimumOrderAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="折扣金額"
                      type="number"
                      fullWidth
                      value={formData.discountAmount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </Grid>
                </>
              )}
              {formData.discountType === "amount_off" && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="折扣金額"
                    type="number"
                    fullWidth
                    value={formData.discountAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountAmount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Grid>
              )}
              {formData.discountType === "percentage" && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="折扣百分比 (0-100)"
                    type="number"
                    fullWidth
                    value={formData.discountPercentage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountPercentage: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    helperText="例如：90 表示 9 折"
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  label="開始日期 *"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="結束日期 *"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="總數量"
                  type="number"
                  fullWidth
                  value={formData.totalQuantity || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalQuantity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="每人限用次數"
                  type="number"
                  fullWidth
                  value={formData.perUserLimit || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perUserLimit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="每日限用次數"
                  type="number"
                  fullWidth
                  value={formData.perDayLimit || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perDayLimit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  helperText="留空表示無限制"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="分店"
                  fullWidth
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <ImageUpload
                  value={formData.picture}
                  onChange={(url) => setFormData({ ...formData, picture: url })}
                  label="優惠券圖片"
                  helperText="可拖放圖片、選擇檔案或貼上圖片（Ctrl+V / Cmd+V）"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            onClick={selectedCoupon ? handleSave : handleAddSave}
            variant="contained"
          >
            儲存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 設定抽獎點數對話框 */}
      <Dialog open={openDrawCostDialog} onClose={() => setOpenDrawCostDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>設定抽獎點數</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              設定學生每次抽獎所需花費的點數
            </Typography>
            <TextField
              label="抽獎一次所需點數"
              type="number"
              fullWidth
              value={drawCostInput}
              onChange={(e) => setDrawCostInput(e.target.value)}
              helperText={`目前設定: ${drawCostPoints} 點`}
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDrawCostDialog(false)} disabled={savingDrawCost}>
            取消
          </Button>
          <Button onClick={handleSaveDrawCost} variant="contained" disabled={savingDrawCost}>
            {savingDrawCost ? <CircularProgress size={20} /> : "儲存"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
