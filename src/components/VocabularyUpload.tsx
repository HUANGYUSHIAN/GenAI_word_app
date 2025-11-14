"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Paper,
  TextField,
  Grid,
  Snackbar,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import LanguageSelect, { LANGUAGE_OPTIONS } from "./LanguageSelect";

interface WordData {
  word: string;
  spelling?: string | null;
  explanation: string;
  partOfSpeech?: string | null;
  sentence?: string | null;
}

interface VocabularyUploadProps {
  vocabularyId?: string;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

// 將 franc 的語言代碼映射到 LanguageSelect 的格式
function mapFrancToLanguage(francCode: string): string {
  const langMap: Record<string, string> = {
    jpn: "Japanese",
    kor: "Korean",
    eng: "English",
    cmn: "Traditional Chinese", // 中文（普通話）
    zho: "Traditional Chinese", // 中文（通用）
  };

  // 如果直接匹配，返回對應的語言
  if (langMap[francCode]) {
    return langMap[francCode];
  }

  // 如果無法識別，返回預設值
  return "English";
}

// 檢測文本的主要語言
async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return "English";
  }

  try {
    // 動態導入 franc 以避免 SSR 問題
    const { franc } = await import("franc");
    // 使用 franc 檢測語言（只檢測我們支援的語言）
    const detected = franc(text, { only: ["jpn", "kor", "eng", "cmn", "zho"] });
    return mapFrancToLanguage(detected);
  } catch (error) {
    console.error("Language detection failed:", error);
    return "English";
  }
}

export default function VocabularyUpload({
  vocabularyId,
  onUploadSuccess,
  onUploadError,
}: VocabularyUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notification, setNotification] = useState<{ message: string; severity: "error" | "success" | "info" | "warning" } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [langUse, setLangUse] = useState("English");
  const [langExp, setLangExp] = useState("Traditional Chinese");

  const showNotification = (message: string, severity: "error" | "success" | "info" | "warning" = "error") => {
    setNotification({ message, severity });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
      setSuccess("");
      setNotification(null);
      // 重置語言選擇
      setLangUse("English");
      setLangExp("Traditional Chinese");
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let rows: any[] = [];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

      // 根據檔案類型選擇解析方式
      if (fileExtension === "csv") {
        // 使用 papaparse 解析 CSV
        const text = await selectedFile.text();
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parseResult.errors.length > 0) {
          console.warn("CSV 解析警告:", parseResult.errors);
        }

        rows = parseResult.data as any[];
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        // 使用 xlsx 解析 Excel
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      } else {
        showNotification("不支援的檔案格式，請上傳 .csv 或 .xlsx 檔案");
        setLoading(false);
        return;
      }

      if (rows.length === 0) {
        showNotification("檔案為空或無法解析");
        setLoading(false);
        return;
      }

      // 1. 檢查 first row 是否有基本欄位
      const firstRow = rows[0];
      const headers = Object.keys(firstRow).map((h) => h.trim().toLowerCase());
      
      const hasWord = headers.some((h) => h === "word");
      const hasExplanation = headers.some((h) => h === "explanation");
      const hasSentence = headers.some((h) => h === "sentence");
      const hasSpelling = headers.some((h) => h === "spelling");
      const hasPartOfSpeech = headers.some((h) => h === "partofspeech" || h === "part of speech");

      if (!hasWord || !hasExplanation || !hasSentence) {
        const missingFields: string[] = [];
        if (!hasWord) missingFields.push("Word");
        if (!hasExplanation) missingFields.push("Explanation");
        if (!hasSentence) missingFields.push("Sentence");
        showNotification(`檔案格式不符：缺少必要欄位 ${missingFields.join("、")}`);
        setLoading(false);
        return;
      }

      // 解析資料（統一處理 CSV 和 XLSX 的資料格式）
      const words: WordData[] = [];
      const allWordTexts: string[] = [];
      const allExplanationTexts: string[] = [];

      // 2. 檢查每個 row 是否有值
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel 行號（從 2 開始，因為第 1 行是標題）

        // 支援大小寫不敏感的欄位名稱
        const word = row["Word"] || row["word"] || row["WORD"] || "";
        const explanation = row["Explanation"] || row["explanation"] || row["EXPLANATION"] || "";
        const sentence = row["Sentence"] || row["sentence"] || row["SENTENCE"] || null;
        const spelling = hasSpelling ? (row["Spelling"] || row["spelling"] || row["SPELLING"] || null) : null;
        const partOfSpeech = hasPartOfSpeech ? (row["PartOfSpeech"] || row["Part of Speech"] || row["partofspeech"] || row["Part Of Speech"] || null) : null;

        // 檢查必填欄位
        const wordTrimmed = word ? word.toString().trim() : "";
        const explanationTrimmed = explanation ? explanation.toString().trim() : "";
        const sentenceTrimmed = sentence ? sentence.toString().trim() : null;

        if (!wordTrimmed || !explanationTrimmed || !sentenceTrimmed) {
          const missing: string[] = [];
          if (!wordTrimmed) missing.push("Word");
          if (!explanationTrimmed) missing.push("Explanation");
          if (!sentenceTrimmed) missing.push("Sentence");
          showNotification(`第 ${rowNum} 行缺少必要欄位：${missing.join("、")}`);
          setLoading(false);
          return;
        }

        // 檢查可選欄位（如果檔案中有這些欄位，則必須有值）
        if (hasSpelling && !spelling) {
          showNotification(`第 ${rowNum} 行缺少 Spelling 欄位值`);
          setLoading(false);
          return;
        }

        if (hasPartOfSpeech && !partOfSpeech) {
          showNotification(`第 ${rowNum} 行缺少 PartOfSpeech 欄位值`);
          setLoading(false);
          return;
        }

        // 3. 檢查 Sentence 格式（必須有兩個 < 符號）
        if (sentenceTrimmed) {
          const lessThanCount = (sentenceTrimmed.match(/</g) || []).length;
          if (lessThanCount !== 2) {
            showNotification(`第 ${rowNum} 行的 Sentence 格式錯誤：必須包含兩個 < 符號，格式應為 "...<單字<..."`);
            setLoading(false);
            return;
          }

          // 檢查格式是否正確：...<單字<...
          const parts = sentenceTrimmed.split("<");
          if (parts.length !== 3 || !parts[1] || parts[1].trim() === "") {
            showNotification(`第 ${rowNum} 行的 Sentence 格式錯誤：兩個 < 之間必須有單字，格式應為 "...<單字<..."`);
            setLoading(false);
            return;
          }
        }

        words.push({
          word: wordTrimmed,
          explanation: explanationTrimmed,
          sentence: sentenceTrimmed,
          spelling: spelling ? spelling.toString().trim() : null,
          partOfSpeech: partOfSpeech ? partOfSpeech.toString().trim() : null,
        });

        // 收集所有單字和解釋用於語言檢測
        allWordTexts.push(wordTrimmed);
        allExplanationTexts.push(explanationTrimmed);
      }

      if (words.length === 0) {
        showNotification("沒有找到有效的單字資料");
        setLoading(false);
        return;
      }

      // 4. 語言自動檢測
      // 合併所有 Word 欄位進行檢測
      const combinedWords = allWordTexts.join(" ");
      const detectedLangUse = await detectLanguage(combinedWords);

      // 合併所有 Explanation 欄位進行檢測
      const combinedExplanations = allExplanationTexts.join(" ");
      const detectedLangExp = await detectLanguage(combinedExplanations);

      // 自動設定語言
      setLangUse(detectedLangUse);
      setLangExp(detectedLangExp);

      // 驗證檢測到的語言是否在支援列表中
      const supportedLanguages = LANGUAGE_OPTIONS.map((opt) => opt.value);
      if (!supportedLanguages.includes(detectedLangUse)) {
        showNotification(`警告：檢測到的背誦語言 "${detectedLangUse}" 不在支援列表中，請手動選擇正確的語言`, "warning");
      }
      if (!supportedLanguages.includes(detectedLangExp)) {
        showNotification(`警告：檢測到的解釋語言 "${detectedLangExp}" 不在支援列表中，請手動選擇正確的語言`, "warning");
      }

      // 上傳到 API
      if (vocabularyId) {
        // 上傳到現有單字本
        const response = await fetch(`/api/admin/vocabularies/${vocabularyId}/words/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });

        if (response.ok) {
          showNotification(`成功上傳 ${words.length} 個單字`, "success");
          setSelectedFile(null);
          if (onUploadSuccess) onUploadSuccess();
        } else {
          const data = await response.json();
          showNotification(data.error || "上傳失敗");
          if (onUploadError) onUploadError(data.error || "上傳失敗");
        }
      } else {
        // 建立新單字本並上傳 - 直接傳送解析後的資料
        const response = await fetch("/api/vocabularies/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words,
            name: name || "上傳的單字本",
            langUse: langUse,
            langExp: langExp,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          showNotification(`成功建立單字本並上傳 ${data.wordCount} 個單字`, "success");
          setSelectedFile(null);
          if (onUploadSuccess) onUploadSuccess();
        } else {
          const data = await response.json();
          showNotification(data.error || "上傳失敗");
          if (onUploadError) onUploadError(data.error || "上傳失敗");
        }
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      showNotification("上傳失敗: " + error.message);
      if (onUploadError) onUploadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        上傳單字本
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        支援 .csv 或 .xlsx 格式，必須包含 Word、Explanation、Sentence 欄位
      </Typography>

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

      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity || "error"}
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="單字本名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="上傳的單字本"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LanguageSelect
            value={langUse}
            onChange={(value) => setLangUse(value as string)}
            label="背誦語言"
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LanguageSelect
            value={langExp}
            onChange={(value) => setLangExp(value as string)}
            label="解釋語言"
            required
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={loading}
        >
          選擇檔案
          <input
            hidden
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
          />
        </Button>
        {selectedFile && (
          <Typography variant="body2">{selectedFile.name}</Typography>
        )}
        {selectedFile && (
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={loading}
          >
            上傳
          </Button>
        )}
        {loading && <CircularProgress size={24} />}
      </Box>
    </Paper>
  );
}

