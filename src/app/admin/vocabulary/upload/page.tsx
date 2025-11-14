"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useRouter } from "next/navigation";

interface WordData {
  word: string;
  spelling?: string;
  explanation: string;
  partOfSpeech?: string;
  sentence?: string;
}

export default function VocabularyUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<WordData[]>([]);
  const [vocabularyId, setVocabularyId] = useState("");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      // 讀取文件內容
      const text = await file.text();
      
      // 簡單的 CSV 解析（第一行是標題）
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        setError("文件至少需要包含標題行和一行資料");
        setLoading(false);
        return;
      }

      // 解析標題行
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const wordIndex = headers.findIndex((h) => h === "word");
      const spellingIndex = headers.findIndex((h) => h === "spelling");
      const explanationIndex = headers.findIndex((h) => h === "explanation");
      const partOfSpeechIndex = headers.findIndex((h) => h === "partofspeech" || h === "part_of_speech");
      const sentenceIndex = headers.findIndex((h) => h === "sentence");

      if (wordIndex === -1 || explanationIndex === -1) {
        setError("文件必須包含 'word' 和 'explanation' 欄位");
        setLoading(false);
        return;
      }

      // 解析資料行
      const words: WordData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values[wordIndex] && values[explanationIndex]) {
          words.push({
            word: values[wordIndex],
            spelling: spellingIndex !== -1 ? values[spellingIndex] : undefined,
            explanation: values[explanationIndex],
            partOfSpeech: partOfSpeechIndex !== -1 ? values[partOfSpeechIndex] : undefined,
            sentence: sentenceIndex !== -1 ? values[sentenceIndex] : undefined,
          });
        }
      }

      if (words.length === 0) {
        setError("沒有找到有效的單字資料");
        setLoading(false);
        return;
      }

      setPreview(words.slice(0, 10)); // 預覽前 10 筆
    } catch (error: any) {
      console.error("Error parsing file:", error);
      setError("解析文件失敗: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!vocabularyId || preview.length === 0) {
      setError("請先選擇單字本並上傳文件");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: 實作上傳到 API
      const response = await fetch(`/api/admin/vocabularies/${vocabularyId}/words/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: preview }),
      });

      if (response.ok) {
        router.push("/admin/vocabulary");
      } else {
        setError("上傳失敗");
      }
    } catch (error: any) {
      console.error("Error uploading words:", error);
      setError("上傳失敗: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        上傳單字本
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              選擇單字本
            </Typography>
            <input
              type="text"
              value={vocabularyId}
              onChange={(e) => setVocabularyId(e.target.value)}
              placeholder="輸入單字本ID"
              style={{ width: "100%", padding: "8px", marginTop: "8px" }}
            />
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              上傳 Excel/CSV 文件
            </Typography>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              style={{ marginTop: "8px" }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              文件格式：第一行為標題（word, spelling, explanation, partOfSpeech, sentence），spelling 和 partOfSpeech 為可選
            </Typography>
          </Box>

          {preview.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                預覽（前 10 筆）
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>單字</TableCell>
                      <TableCell>拼音</TableCell>
                      <TableCell>解釋</TableCell>
                      <TableCell>詞性</TableCell>
                      <TableCell>例句</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((word, index) => (
                      <TableRow key={index}>
                        <TableCell>{word.word}</TableCell>
                        <TableCell>{word.spelling || "-"}</TableCell>
                        <TableCell>{word.explanation}</TableCell>
                        <TableCell>{word.partOfSpeech || "-"}</TableCell>
                        <TableCell>{word.sentence || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <UploadFileIcon />}
              onClick={handleSubmit}
              disabled={loading || preview.length === 0 || !vocabularyId}
            >
              上傳
            </Button>
            <Button variant="outlined" onClick={() => router.back()}>
              取消
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}



