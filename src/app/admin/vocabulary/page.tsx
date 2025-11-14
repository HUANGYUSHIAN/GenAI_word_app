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
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface Vocabulary {
  vocabularyId: string;
  name: string;
  langUse: string;
  langExp: string;
  copyrights: string | null;
  establisher: string;
  wordCount: number;
  createdAt: string;
}

export default function AdminVocabularyPage() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedVocabulary, setSelectedVocabulary] = useState<Vocabulary | null>(null);
  const [words, setWords] = useState<any[]>([]);
  const [wordsPage, setWordsPage] = useState(0);
  const [wordsPerPage, setWordsPerPage] = useState(50);
  const [wordsTotal, setWordsTotal] = useState(0);
  const [loadingWords, setLoadingWords] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    langUse: "",
    langExp: "",
    copyrights: "",
    establisher: "",
  });

  useEffect(() => {
    fetchVocabularies();
  }, [page, rowsPerPage]);

  const fetchVocabularies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/vocabularies?page=${page}&limit=${rowsPerPage}`
      );
      if (response.ok) {
        const data = await response.json();
        setVocabularies(data.vocabularies || []);
        setTotal(data.total || 0);
      } else {
        setError("載入單字本資料失敗");
      }
    } catch (error) {
      console.error("Error fetching vocabularies:", error);
      setError("載入單字本資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchWords = async (vocabularyId: string, pageNum: number) => {
    try {
      setLoadingWords(true);
      const response = await fetch(
        `/api/admin/vocabularies/${vocabularyId}/words?page=${pageNum}&limit=${wordsPerPage}`
      );
      if (response.ok) {
        const data = await response.json();
        setWords(data.words || []);
        setWordsTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoadingWords(false);
    }
  };

  const handleView = async (vocabulary: Vocabulary) => {
    setSelectedVocabulary(vocabulary);
    setWordsPage(0);
    setOpenViewDialog(true);
    await fetchWords(vocabulary.vocabularyId, 0);
  };

  const handleEdit = (vocabulary: Vocabulary) => {
    setSelectedVocabulary(vocabulary);
    setFormData({
      name: vocabulary.name,
      langUse: vocabulary.langUse,
      langExp: vocabulary.langExp,
      copyrights: vocabulary.copyrights || "",
      establisher: vocabulary.establisher,
    });
    setOpenDialog(true);
  };

  const handleDelete = async (vocabularyId: string) => {
    if (!confirm("確定要刪除此單字本嗎？")) return;

    try {
      const response = await fetch(`/api/admin/vocabularies/${vocabularyId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchVocabularies();
      } else {
        setError("刪除單字本失敗");
      }
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      setError("刪除單字本失敗");
    }
  };

  const handleSave = async () => {
    if (!selectedVocabulary) return;

    try {
      const response = await fetch(
        `/api/admin/vocabularies/${selectedVocabulary.vocabularyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (response.ok) {
        setOpenDialog(false);
        fetchVocabularies();
      } else {
        setError("更新單字本失敗");
      }
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      setError("更新單字本失敗");
    }
  };

  const handleAdd = () => {
    setSelectedVocabulary(null);
    setFormData({
      name: "",
      langUse: "",
      langExp: "",
      copyrights: "",
      establisher: "",
    });
    setOpenDialog(true);
  };

  const handleAddSave = async () => {
    try {
      const response = await fetch("/api/admin/vocabularies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setOpenDialog(false);
        fetchVocabularies();
      } else {
        setError("新增單字本失敗");
      }
    } catch (error) {
      console.error("Error adding vocabulary:", error);
      setError("新增單字本失敗");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">單字本管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增單字本
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
              <TableCell>單字本ID</TableCell>
              <TableCell>名稱</TableCell>
              <TableCell>背誦語言</TableCell>
              <TableCell>解釋語言</TableCell>
              <TableCell>單字數</TableCell>
              <TableCell>建立者</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : vocabularies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  沒有資料
                </TableCell>
              </TableRow>
            ) : (
              vocabularies.map((vocabulary) => (
                <TableRow key={vocabulary.vocabularyId}>
                  <TableCell>{vocabulary.vocabularyId}</TableCell>
                  <TableCell>{vocabulary.name}</TableCell>
                  <TableCell>{vocabulary.langUse}</TableCell>
                  <TableCell>{vocabulary.langExp}</TableCell>
                  <TableCell>{vocabulary.wordCount}</TableCell>
                  <TableCell>{vocabulary.establisher}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleView(vocabulary)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(vocabulary)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(vocabulary.vocabularyId)}
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

      {/* 查看對話框 - 顯示單字內容（分頁） */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          查看單字本 - {selectedVocabulary?.name}
        </DialogTitle>
        <DialogContent>
          {selectedVocabulary && (
            <Box sx={{ pt: 2 }}>
              <Typography><strong>單字本ID:</strong> {selectedVocabulary.vocabularyId}</Typography>
              <Typography><strong>名稱:</strong> {selectedVocabulary.name}</Typography>
              <Typography><strong>背誦語言:</strong> {selectedVocabulary.langUse}</Typography>
              <Typography><strong>解釋語言:</strong> {selectedVocabulary.langExp}</Typography>
              <Typography><strong>版權:</strong> {selectedVocabulary.copyrights || "-"}</Typography>
              <Typography><strong>建立者:</strong> {selectedVocabulary.establisher}</Typography>
              <Typography><strong>單字數:</strong> {selectedVocabulary.wordCount}</Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>單字列表</Typography>
                {loadingWords ? (
                  <CircularProgress />
                ) : (
                  <>
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
                          {words.map((word) => (
                            <TableRow key={word.id}>
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
                    <TablePagination
                      component="div"
                      count={wordsTotal}
                      page={wordsPage}
                      onPageChange={async (e, newPage) => {
                        setWordsPage(newPage);
                        await fetchWords(selectedVocabulary.vocabularyId, newPage);
                      }}
                      rowsPerPage={wordsPerPage}
                      onRowsPerPageChange={(e) => {
                        setWordsPerPage(parseInt(e.target.value, 10));
                        setWordsPage(0);
                      }}
                      rowsPerPageOptions={[50, 100, 200]}
                    />
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 編輯/新增對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedVocabulary ? "編輯單字本" : "新增單字本"}</DialogTitle>
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
              label="背誦語言"
              value={formData.langUse}
              onChange={(e) => setFormData({ ...formData, langUse: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="解釋語言"
              value={formData.langExp}
              onChange={(e) => setFormData({ ...formData, langExp: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="版權"
              value={formData.copyrights}
              onChange={(e) => setFormData({ ...formData, copyrights: e.target.value })}
              fullWidth
            />
            <TextField
              label="建立者ID"
              value={formData.establisher}
              onChange={(e) => setFormData({ ...formData, establisher: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            onClick={selectedVocabulary ? handleSave : handleAddSave}
            variant="contained"
          >
            儲存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



