"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";

interface Branch {
  branchName: string;
  address: string;
}

interface ShopProfileFormData {
  shopName: string;
  branchName: string;
  address: string;
  shopType: string;
  shopTypeLabel: string;
  phoneNumber: string;
  website: string;
  notes: string;
  branches: Branch[];
}

type Mode = "view" | "edit";

const SHOP_TYPES = [
  { value: "coffee_shop", label: "咖啡廳" },
  { value: "restaurant", label: "餐廳" },
  { value: "dessert", label: "甜點店" },
  { value: "bar", label: "酒吧" },
  { value: "retail", label: "零售店" },
  { value: "service", label: "服務業" },
  { value: "other", label: "其他" },
];

const STORAGE_KEY = "supplier_shop_profile_draft";
const MODE_STORAGE_KEY = "supplier_shop_profile_mode";

function loadDraft(): ShopProfileFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ShopProfileFormData) : null;
  } catch {
    return null;
  }
}

function saveDraft(data: ShopProfileFormData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function saveMode(mode: Mode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

function loadMode(): Mode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return saved === "edit" || saved === "view" ? saved : null;
  } catch {
    return null;
  }
}

export default function SupplierStorePage() {
  const { data: session } = useSession();

  const initialForm = useMemo<ShopProfileFormData>(
    () => ({
      shopName: "",
      branchName: "",
      address: "",
      shopType: "other",
      shopTypeLabel: "其他",
      phoneNumber: "",
      website: "",
      notes: "",
      branches: [],
    }),
    []
  );

  const [mode, setMode] = useState<Mode>("view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedData, setSavedData] = useState<ShopProfileFormData | null>(null);
  const [formData, setFormData] = useState<ShopProfileFormData>(initialForm);

  // 初始化：優先讀取後端資料，沒有資料時讀草稿
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/supplier/shop-profile");
        if (res.ok) {
          const data = await res.json();
          const profile = data.shopProfile;
          const primaryBranch =
            profile.branches && profile.branches.length > 0 ? profile.branches[0] : null;
          // 將主要分店從 branches 陣列中移除，只保留其他分店（從索引 1 開始）
          const otherBranches = profile.branches && profile.branches.length > 1 
            ? profile.branches.slice(1) 
            : [];
          const loaded: ShopProfileFormData = {
            shopName: profile.shopName || "",
            branchName: primaryBranch?.branchName || "",
            address: primaryBranch?.address || "",
            shopType: profile.shopType || "other",
            shopTypeLabel: profile.shopTypeLabel || "其他",
            phoneNumber: profile.phoneNumber || "",
            website: profile.website || "",
            notes: profile.notes || "",
            branches: otherBranches, // 只包含其他分店，不包含主要分店
          };

          // 檢查是否有草稿，如果有草稿說明用戶可能在編輯
          const draft = loadDraft();
          const savedMode = loadMode();
          
          if (draft && savedMode === "edit") {
            // 有草稿且之前是編輯模式，恢復編輯模式
            setSavedData(loaded);
            setFormData(draft); // 使用草稿資料
            setMode("edit");
          } else {
            // 沒有草稿或之前是查看模式，顯示查看模式
            setSavedData(loaded);
            setFormData(loaded);
            setMode("view");
            clearDraft(); // 清除可能存在的舊草稿
          }
        } else if (res.status === 404) {
          // 404 表示沒有資料，檢查是否有草稿
          const draft = loadDraft();
          const savedMode = loadMode();
          
          if (draft && savedMode === "edit") {
            // 有草稿且之前是編輯模式，恢復編輯模式
            setSavedData(initialForm);
            setFormData(draft); // 使用草稿資料
            setMode("edit");
          } else {
            // 沒有草稿或之前是查看模式，顯示查看模式（允許留空）
            setSavedData(initialForm);
            setFormData(initialForm);
            setMode("view");
            clearDraft(); // 清除可能存在的舊草稿
          }
        } else {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "載入店鋪資訊失敗");
        }
      } catch (e) {
        console.error(e);
        setError("載入店鋪資訊失敗");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, initialForm]);

  // 編輯模式自動存草稿和模式狀態
  useEffect(() => {
    if (mode === "edit") {
      saveDraft(formData);
      saveMode("edit");
    } else {
      saveMode("view");
    }
  }, [formData, mode]);

  const handleBranchChange = (index: number, field: keyof Branch, value: string) => {
    const next = [...formData.branches];
    next[index] = { ...next[index], [field]: value };
    setFormData({ ...formData, branches: next });
  };

  const handleAddBranch = () => {
    setFormData({ ...formData, branches: [...formData.branches, { branchName: "", address: "" }] });
  };

  const handleRemoveBranch = (index: number) => {
    setFormData({
      ...formData,
      branches: formData.branches.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!formData.shopName.trim()) {
      setError("店家名稱是必填欄位");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const branches: Branch[] = [];
      if (formData.branchName.trim() || formData.address.trim()) {
        branches.push({
          branchName: formData.branchName.trim() || formData.shopName,
          address: formData.address.trim(),
        });
      }
      formData.branches.forEach((b) => {
        if (b.branchName.trim()) {
          branches.push({
            branchName: b.branchName.trim(),
            address: b.address.trim(),
          });
        }
      });

      const payload = {
        supplierId: session?.userId,
        shopName: formData.shopName.trim(),
        branchName: formData.branchName.trim() || null,
        address: formData.address.trim() || null,
        shopType: formData.shopType,
        shopTypeLabel: formData.shopTypeLabel,
        phoneNumber: formData.phoneNumber.trim() || null,
        website: formData.website.trim() || null,
        notes: formData.notes.trim() || null,
        branches: branches.length > 0 ? branches : null,
      };

      const res = await fetch("/api/supplier/shop-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "儲存失敗");
      }

      // 儲存成功後，從 API 響應中讀取更新後的資料
      const responseData = await res.json();
      const profile = responseData.shopProfile;
      const primaryBranch =
        profile.branches && profile.branches.length > 0 ? profile.branches[0] : null;
      // 將主要分店從 branches 陣列中移除，只保留其他分店（從索引 1 開始）
      const otherBranches = profile.branches && profile.branches.length > 1 
        ? profile.branches.slice(1) 
        : [];
      const updatedData: ShopProfileFormData = {
        shopName: profile.shopName || "",
        branchName: primaryBranch?.branchName || "",
        address: primaryBranch?.address || "",
        shopType: profile.shopType || "other",
        shopTypeLabel: profile.shopTypeLabel || "其他",
        phoneNumber: profile.phoneNumber || "",
        website: profile.website || "",
        notes: profile.notes || "",
        branches: otherBranches, // 只包含其他分店，不包含主要分店
      };

      setSavedData(updatedData);
      setFormData(updatedData);
      setMode("view");
      setSuccess("店鋪資訊儲存成功！");
      clearDraft();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    // 進入編輯模式時，載入已保存的資料（如果有的話）
    let dataToLoad: ShopProfileFormData;
    if (savedData) {
      dataToLoad = savedData;
    } else {
      // 如果沒有已保存的資料，嘗試載入草稿
      const draft = loadDraft();
      dataToLoad = draft || initialForm;
    }
    setFormData(dataToLoad);
    setMode("edit");
    // 立即保存草稿和模式，確保在切換頁面前有草稿
    saveDraft(dataToLoad);
    saveMode("edit");
  };

  const handleCancel = () => {
    if (savedData) {
      setFormData(savedData);
      setMode("view");
      saveMode("view");
      clearDraft(); // 取消編輯時清除草稿
    } else {
      const draft = loadDraft();
      if (draft) setFormData(draft);
      setMode("edit");
      saveMode("edit");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const isView = mode === "view";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">店鋪資訊管理</Typography>
        {mode === "edit" && savedData && (
          <Button variant="outlined" onClick={handleCancel} disabled={saving}>
            取消
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {isView ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            店鋪資訊
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                店家名稱
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.shopName || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                店家類型
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.shopTypeLabel || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                主要分店名稱
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.branchName || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                主要分店地址
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.address || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                聯絡電話
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.phoneNumber || "-"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                網站
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.website ? (
                  <a href={savedData.website} target="_blank" rel="noopener noreferrer">
                    {savedData.website}
                  </a>
                ) : (
                  "-"
                )}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                備註
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {savedData?.notes || "-"}
              </Typography>
            </Grid>
            {savedData && savedData.branches.length > 0 && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    其他分店
                  </Typography>
                </Grid>
                {savedData.branches.map((branch, idx) => (
                  <Grid item xs={12} key={idx}>
                    <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                        {branch.branchName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {branch.address || "無地址"}
      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </>
            )}
          </Grid>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              {savedData?.shopName ? "編輯" : "新增店鋪資訊"}
            </Button>
          </Box>
        </Paper>
      ) : (
      <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            基本資訊
          </Typography>

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
              <FormControl fullWidth>
                <InputLabel>店家類型 *</InputLabel>
                <Select
                  value={formData.shopType}
                  label="店家類型 *"
                  onChange={(e) => {
                    const val = e.target.value as string;
                    const type = SHOP_TYPES.find((t) => t.value === val);
                    setFormData({
                      ...formData,
                      shopType: val,
                      shopTypeLabel: type?.label || "其他",
                    });
                  }}
                >
                  {SHOP_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="主要分店名稱"
                fullWidth
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                helperText="如果只有一個分店，可在此填寫"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="主要分店地址"
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="聯絡電話"
                fullWidth
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="網站"
                fullWidth
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="備註"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                helperText="例如：營業時間、特殊服務等"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">其他分店</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddBranch} size="small">
              新增分店
            </Button>
          </Box>

          {formData.branches.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              目前沒有其他分店。如果有多個分店，可以點擊「新增分店」按鈕添加。
            </Alert>
          ) : (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {formData.branches.map((branch, index) => (
                <Grid item xs={12} key={index}>
                  <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <TextField
                          label="分店名稱"
                          fullWidth
                          size="small"
                          value={branch.branchName}
                          onChange={(e) => handleBranchChange(index, "branchName", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="分店地址"
                          fullWidth
                          size="small"
                          value={branch.address}
                          onChange={(e) => handleBranchChange(index, "address", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton color="error" onClick={() => handleRemoveBranch(index)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
            {savedData && (
              <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                取消
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              size="large"
            >
              {saving ? "儲存中..." : "儲存店鋪資訊"}
            </Button>
          </Box>
      </Paper>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        💡 提示：此店鋪資訊會作為優惠券表單的預設值，讓您在建立優惠券時不需要重複輸入店家資訊。
      </Alert>
    </Box>
  );
}

