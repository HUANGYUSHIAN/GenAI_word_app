# 優惠券生成功能測試指南

本文件說明如何測試優惠券生成 API 功能。

## 📋 測試方法

### 方法 1: 使用前端測試頁面（推薦）⭐

這是最簡單的測試方法，無需手動設置 session cookie。

#### 步驟：

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **登入系統**
   - 訪問 `http://localhost:3000/login`
   - 使用 Google OAuth 或測試帳號登入
   - **重要**：確保您的帳號類型是 `Supplier`（供應商）

3. **訪問測試頁面**
   - 登入後，訪問 `http://localhost:3000/supplier/coupon`
   - 您會看到一個完整的優惠券表單

4. **填寫表單**
   - 點擊「載入範例」按鈕可以快速載入範例數據
   - 或手動填寫表單欄位
   - Supplier ID 會自動從您的 session 獲取

5. **生成優惠券**
   - 點擊「生成優惠券」按鈕
   - 查看返回的結果，包括：
     - `couponData`: 規範化的優惠券數據
     - `supplierPreview`: 供應商預覽格式
     - `studentView`: 學生視圖格式

#### 測試不同折扣類型：

**滿額折扣 (threshold_amount_off)**
- 折扣類型：選擇「滿額折扣」
- 最低消費金額：300
- 折扣金額：50
- 結果應顯示：「滿 300 元折 50 元」

**固定金額折扣 (amount_off)**
- 折扣類型：選擇「固定金額折扣」
- 折扣金額：20
- 結果應顯示：「折 20 元」

**百分比折扣 (percentage)**
- 折扣類型：選擇「百分比折扣」
- 折扣百分比：90（表示 9 折）
- 結果應顯示：「全單 9 折」

---

### 方法 2: 使用測試腳本

適合自動化測試或 CI/CD 流程。

#### 步驟：

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **獲取 Session Cookie**
   - 在瀏覽器中登入系統
   - 打開開發者工具 (F12)
   - 前往「Application」或「儲存」標籤
   - 找到 Cookies → `http://localhost:3000`
   - 複製 `next-auth.session-token` 的值

3. **設置環境變數並運行測試**
   ```bash
   # Windows PowerShell
   $env:SESSION_COOKIE="next-auth.session-token=YOUR_TOKEN_VALUE"
   npm run test:coupon-generate

   # Windows CMD
   set SESSION_COOKIE=next-auth.session-token=YOUR_TOKEN_VALUE
   npm run test:coupon-generate

   # Linux/Mac
   SESSION_COOKIE="next-auth.session-token=YOUR_TOKEN_VALUE" npm run test:coupon-generate
   ```

   或直接作為命令行參數：
   ```bash
   npm run test:coupon-generate "next-auth.session-token=YOUR_TOKEN_VALUE"
   ```

4. **編輯測試腳本（可選）**
   - 編輯 `scripts/test-coupon-generate.ts`
   - 將 `YOUR_SUPPLIER_ID` 替換為實際的 supplierId
   - 修改測試案例數據

---

### 方法 3: 使用 curl 命令

適合快速測試或調試。

#### 步驟：

1. **獲取 Session Cookie**（同方法 2）

2. **發送請求**
   ```bash
   curl -X POST http://localhost:3000/api/supplier/coupons/generate \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN_VALUE" \
     -d '{
       "supplierId": "YOUR_SUPPLIER_ID",
       "shopName": "Awesome Coffee",
       "couponName": "滿 300 折 50",
       "description": "僅限內用，不與其他優惠併用",
       "discountType": "threshold_amount_off",
       "minimumOrderAmount": 300,
       "discountAmount": 50,
       "startDate": "2025-01-01",
       "endDate": "2025-03-31",
       "requiredPoints": 500,
       "status": "active"
     }'
   ```

---

### 方法 4: 使用 Postman 或 Thunder Client

適合 API 測試和文檔化。

#### 設置：

1. **請求方法**: POST
2. **URL**: `http://localhost:3000/api/supplier/coupons/generate`
3. **Headers**:
   - `Content-Type: application/json`
   - `Cookie: next-auth.session-token=YOUR_TOKEN_VALUE`
4. **Body** (JSON):
   ```json
   {
     "supplierId": "YOUR_SUPPLIER_ID",
     "shopName": "Awesome Coffee",
     "couponName": "滿 300 折 50",
     "description": "僅限內用，不與其他優惠併用",
     "imageUrl": "https://example.com/coffee.jpg",
     "discountType": "threshold_amount_off",
     "minimumOrderAmount": 300,
     "discountAmount": 50,
     "discountPercentage": null,
     "startDate": "2025-01-01",
     "endDate": "2025-03-31",
     "totalQuantity": 100,
     "perUserLimit": 1,
     "perDayLimit": 10,
     "requiredPoints": 500,
     "internalCode": "COFFEE2025",
     "branch": "台北信義店",
     "status": "active"
   }
   ```

---

## ✅ 預期結果

成功的響應應包含三個主要部分：

### 1. couponData
```json
{
  "couponId": "couponxxxx",
  "supplierId": "...",
  "shopName": "...",
  "name": "...",
  "redemptionUrl": "https://app.example.com/redeem/...",
  "qrCodeContent": "https://app.example.com/redeem/...",
  "barcodeContent": "...",
  ...
}
```

### 2. supplierPreview
```json
{
  "title": "...",
  "subtitle": "...",
  "mainText": "...",
  "validityText": "有效期間：...",
  "pointsText": "兌換條件：...",
  ...
}
```

### 3. studentView
```json
{
  "title": "...",
  "shortDescription": "...",
  "discountSummary": "...",
  "usageRules": "...",
  "canRedeemCondition": "...",
  ...
}
```

---

## 🐛 常見問題

### 1. 401 未登入錯誤
- **原因**: 未提供有效的 session cookie 或 session 已過期
- **解決**: 重新登入並獲取新的 session cookie

### 2. 403 無權限錯誤
- **原因**: 當前用戶不是 Supplier 類型
- **解決**: 確保帳號類型是 `Supplier`，可以通過 `/api/user/select-role` 設置

### 3. 400 缺少必要字段錯誤
- **原因**: 請求中缺少必要字段
- **解決**: 檢查請求數據是否包含所有必要字段：
  - `supplierId`
  - `shopName`
  - `couponName`
  - `discountType`
  - `startDate`
  - `endDate`
  - `requiredPoints`

### 4. supplierId 與當前用戶不匹配
- **原因**: 請求中的 supplierId 與登入用戶的 userId 不一致
- **解決**: 使用當前登入用戶的 userId 作為 supplierId，或在前端讓系統自動獲取

---

## 📝 測試檢查清單

- [ ] 測試滿額折扣類型
- [ ] 測試固定金額折扣類型
- [ ] 測試百分比折扣類型
- [ ] 測試日期自動交換（結束日期早於開始日期）
- [ ] 測試可選字段為 null 的情況
- [ ] 測試 perDayLimit 為 null（無每日限制）
- [ ] 測試中文優惠券名稱（確保 couponId 生成正確）
- [ ] 測試不同狀態（draft, active, disabled）
- [ ] 驗證 QR code 和 barcode 內容
- [ ] 驗證 redemptionUrl 格式

---

## 🔗 相關文件

- API 路由: `src/app/api/supplier/coupons/generate/route.ts`
- 測試腳本: `scripts/test-coupon-generate.ts`
- 前端測試頁面: `src/app/supplier/coupon/page.tsx`
- 工具函數: `src/lib/utils.ts`


