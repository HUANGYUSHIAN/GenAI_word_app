<!-- 8276d3ba-7b00-42ee-8d29-2eae55f13ee5 610a0eee-f6c9-4ec8-b69c-f4a7bf5f61f8 -->
# Student Vocabulary Management Implementation Plan

## 問題分析

1. `/api/vocabularies/upload` 返回 500 錯誤 - 需要檢查並修復
2. Student 端缺少單字本顯示和管理功能
3. 需要統一的語言選擇組件避免輸入不一致

## 實作項目

### 1. 創建 LanguageSelect 組件

- **檔案**: `src/components/LanguageSelect.tsx`
- **功能**: 統一的語言下拉選單組件
- **選項**: 日文、韓文、英文、繁體中文
- **格式**: 使用標準語言代碼（"ja", "ko", "en", "zh-TW"）作為值，顯示中文名稱
- **Props**: `value`, `onChange`, `label`, `required`

### 2. 修復 Student 上傳問題

- **檔案**: `src/app/api/vocabularies/upload/route.ts`
- **問題**: 檢查錯誤日誌，可能是資料庫連接或權限問題
- **解決**: 確保 API 正確處理 student 角色的請求

### 3. 創建 Student Vocabulary API 端點

- **檔案**: `src/app/api/student/vocabularies/route.ts`
  - `GET /api/student/vocabularies`: 獲取當前 student 建立的單字本列表（過濾 `establisher = session.userId`）
  - `GET /api/student/vocabularies/browse`: 瀏覽所有單字本，支援查詢參數過濾
    - `name`: 過濾 Vocabulary.Name（部分匹配）
    - `langUse`: 過濾 Vocabulary.LangUse（精確匹配）
    - `langExp`: 過濾 Vocabulary.LangExp（精確匹配）
    - `page`, `limit`: 分頁參數

- **檔案**: `src/app/api/student/vocabularies/[vocabularyId]/route.ts`
  - `GET`: 獲取單字本詳情（檢查是否為建立者）
  - `PUT`: 更新單字本基本資訊（僅限建立者是自己）

- **檔案**: `src/app/api/student/vocabularies/[vocabularyId]/words/route.ts`
  - `GET`: 獲取單字列表（分頁）
  - `PUT`: 批量更新單字（僅限建立者是自己）

### 4. 實作 Student Vocabulary 頁面

- **檔案**: `src/app/student/vocabulary/page.tsx`
- **功能**:
  - **上傳區塊**: 使用 `VocabularyUpload` 組件（已存在）
  - **我的單字本區塊**: 
    - 顯示自己建立的單字本列表（表格形式，參考 admin 設計）
    - 顯示：名稱、LangUse、LangExp、單字數、建立時間
    - 操作：查看（可編輯單字）、編輯（僅限自己建立的）
    - 查看對話框：可編輯單字列表，儲存按鈕（僅限自己建立的）
  - **瀏覽單字本區塊**:
    - "Browse" 按鈕，點擊後顯示對話框
    - 過濾表單：Name（文字輸入）、LangUse（LanguageSelect）、LangExp（LanguageSelect）
    - 結果列表：顯示所有符合條件的單字本
    - 只能查看，不能編輯（除非是自己建立的）

### 5. 更新 VocabularyUpload 組件

- **檔案**: `src/components/VocabularyUpload.tsx`
- **變更**: 
  - 添加 `langUse` 和 `langExp` 的 LanguageSelect 下拉選單
  - 移除硬編碼的 "en" 和 "zh-TW"
  - 在上傳時包含用戶選擇的語言

### 6. 更新 Admin Vocabulary 頁面

- **檔案**: `src/app/admin/vocabulary/page.tsx`
- **變更**: 
  - 將 `langUse` 和 `langExp` 的 TextField 改為 LanguageSelect 組件
  - 確保所有語言輸入都使用統一的下拉選單

## 技術細節

### 語言代碼映射

```typescript
const LANGUAGE_OPTIONS = [
  { value: "ja", label: "日文" },
  { value: "ko", label: "韓文" },
  { value: "en", label: "英文" },
  { value: "zh-TW", label: "繁體中文" }
];
```

### 權限檢查邏輯

- Student 查看單字本：檢查 `vocabulary.establisher === session.userId`
- Student 修改單字本：檢查 `vocabulary.establisher === session.userId`，否則返回 403
- Browse 功能：所有已登入用戶都可以使用，但編輯權限仍受限於建立者

### 資料庫查詢

- 使用 Prisma 的 `where` 條件過濾
- Browse 功能使用 `OR` 條件組合多個過濾器（如果提供多個過濾條件）

## 檔案清單

### 新建檔案

1. `src/components/LanguageSelect.tsx`
2. `src/app/api/student/vocabularies/route.ts`
3. `src/app/api/student/vocabularies/[vocabularyId]/route.ts`
4. `src/app/api/student/vocabularies/[vocabularyId]/words/route.ts`

### 修改檔案

1. `src/app/student/vocabulary/page.tsx` - 完全重寫，參考 admin 設計
2. `src/components/VocabularyUpload.tsx` - 添加語言選擇
3. `src/app/admin/vocabulary/page.tsx` - 改用 LanguageSelect
4. `src/app/api/vocabularies/upload/route.ts` - 修復 500 錯誤