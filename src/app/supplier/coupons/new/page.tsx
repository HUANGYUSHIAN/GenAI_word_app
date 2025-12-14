"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImageUpload from "@/components/ImageUpload";

interface CouponFormData {
  supplierId: string;
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
  status: "draft" | "active" | "disabled";
}

export default function NewCouponPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingShopProfile, setLoadingShopProfile] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    supplierId: "",
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
    status: "active", // Default to "active" so coupons appear in student catalog immediately
  });

  const STORAGE_KEY = "supplier_coupon_form_draft";

  // 從 localStorage 載入表單數據
  const loadFormDataFromStorage = (): CouponFormData | null => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading form data from storage:", e);
    }
    return null;
  };

  // 保存表單數據到 localStorage
  const saveFormDataToStorage = (data: CouponFormData) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving form data to storage:", e);
    }
  };

  // 清除 localStorage 中的表單數據
  const clearFormDataFromStorage = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Error clearing form data from storage:", e);
    }
  };

  // 載入店鋪資訊作為預設值
  useEffect(() => {
    if (session?.userId) {
      // 先嘗試從 localStorage 載入
      const savedFormData = loadFormDataFromStorage();
      if (savedFormData) {
        setFormData(savedFormData);
      }
      loadShopProfile();
    }
  }, [session]);

  // 當表單數據改變時，自動保存到 localStorage
  useEffect(() => {
    if (session?.userId && formData.supplierId) {
      saveFormDataToStorage(formData);
    }
  }, [formData, session]);

  const loadShopProfile = async () => {
    try {
      setLoadingShopProfile(true);
      const response = await fetch("/api/supplier/shop-profile");
      if (response.ok) {
        const data = await response.json();
        const defaults = data.couponFormDefaults;

        // 只有在沒有從 localStorage 載入數據時才使用店鋪資訊預設值
        const savedFormData = loadFormDataFromStorage();
        if (!savedFormData || !savedFormData.shopName) {
          setFormData((prev) => ({
            ...prev,
            supplierId: session?.userId || "",
            shopName: defaults.defaultShopName || prev.shopName,
            branch: defaults.defaultBranchName || prev.branch,
          }));
        }
      }
    } catch (err) {
      console.error("Error loading shop profile:", err);
    } finally {
      setLoadingShopProfile(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const requestData: any = {
        supplierId: session?.userId || formData.supplierId,
        shopName: formData.shopName,
        couponName: formData.couponName,
        description: formData.description,
        discountType: formData.discountType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status || "active", // Default to "active" if not specified
      };

      if (formData.discountType === "threshold_amount_off") {
        requestData.minimumOrderAmount = formData.minimumOrderAmount;
        requestData.discountAmount = formData.discountAmount;
      } else if (formData.discountType === "amount_off") {
        requestData.discountAmount = formData.discountAmount;
      } else if (formData.discountType === "percentage") {
        requestData.discountPercentage = formData.discountPercentage;
      }

      if (formData.totalQuantity !== null) requestData.totalQuantity = formData.totalQuantity;
      if (formData.perUserLimit !== null) requestData.perUserLimit = formData.perUserLimit;
      if (formData.perDayLimit !== null) requestData.perDayLimit = formData.perDayLimit;
      if (formData.branch) requestData.branch = formData.branch;
      if (formData.picture) requestData.picture = formData.picture;

      const response = await fetch("/api/supplier/coupons/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "請求失敗");
      }

      setResult(data);
      setSuccess("優惠券已成功建立並儲存！");
      // 清除 localStorage 中的表單數據
      clearFormDataFromStorage();
    } catch (err: any) {
      setError(err.message || "發生錯誤");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const [success, setSuccess] = useState("");

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/supplier/coupons")}
            sx={{ mr: 2 }}
          >
            返回優惠券管理
          </Button>
          <Typography variant="h4">新增優惠券</Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => {
            if (confirm("確定要清除目前填寫的內容嗎？")) {
              clearFormDataFromStorage();
              setFormData({
                supplierId: session?.userId || "",
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
                status: "active", // Default to "active" so coupons appear in student catalog immediately
              });
            }
          }}
        >
          清除表單
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => {
            setSuccess("");
            router.push("/supplier/coupons");
          }}
          action={
            <Button color="inherit" size="small" onClick={() => router.push("/supplier/coupons")}>
              查看優惠券列表
            </Button>
          }
        >
          {success}
        </Alert>
      )}

      {loadingShopProfile && (
        <Alert severity="info" sx={{ mb: 2 }}>
          正在載入店鋪資訊...
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          優惠券資訊
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="店家名稱 *"
              fullWidth
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              required
              helperText="可從店鋪資訊頁面自動載入"
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
              helperText="可從店鋪資訊頁面自動載入"
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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>狀態</InputLabel>
              <Select
                value={formData.status}
                label="狀態"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as any,
                  })
                }
              >
                <MenuItem value="draft">草稿</MenuItem>
                <MenuItem value="active">啟用</MenuItem>
                <MenuItem value="disabled">停用</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleSubmit}
              disabled={loading}
              fullWidth
              size="large"
            >
              {loading ? "建立中..." : "建立優惠券"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            優惠券預覽
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>供應商預覽</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                  {result.supplierPreview.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {result.supplierPreview.subtitle}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {result.supplierPreview.mainText}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {result.supplierPreview.validityText}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {result.supplierPreview.pointsText}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>學生視圖</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
                  {result.studentView.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {result.studentView.shopName}
                  {result.studentView.branch && ` - ${result.studentView.branch}`}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>折扣摘要:</strong> {result.studentView.discountSummary}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>使用規則:</strong> {result.studentView.usageRules}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {result.studentView.canRedeemCondition}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}
    </Box>
  );
}

