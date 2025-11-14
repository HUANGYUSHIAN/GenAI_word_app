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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface Coupon {
  couponId: string;
  name: string;
  period: string;
  link: string | null;
  text: string | null;
  picture: string | null;
  createdAt: string;
}

export default function AdminCouponPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    period: "",
    link: "",
    text: "",
    picture: "",
  });

  useEffect(() => {
    fetchCoupons();
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

  const handleView = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setOpenViewDialog(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      name: coupon.name,
      period: coupon.period.split("T")[0],
      link: coupon.link || "",
      text: coupon.text || "",
      picture: coupon.picture || "",
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
      name: "",
      period: "",
      link: "",
      text: "",
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
        setError("新增優惠券失敗");
      }
    } catch (error) {
      console.error("Error adding coupon:", error);
      setError("新增優惠券失敗");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">優惠券管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增優惠券
        </Button>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCoupon ? "編輯優惠券" : "新增優惠券"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="名稱"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="使用期限"
              type="date"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="連結"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              fullWidth
            />
            <TextField
              label="內容"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="圖片URL"
              value={formData.picture}
              onChange={(e) => setFormData({ ...formData, picture: e.target.value })}
              fullWidth
            />
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
    </Box>
  );
}



