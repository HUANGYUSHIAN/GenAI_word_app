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
  Card,
  CardContent,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VocabularyUpload from "@/components/VocabularyUpload";
import LanguageSelect, { LANGUAGE_OPTIONS } from "@/components/LanguageSelect";
import { useSession } from "next-auth/react";
import MenuItem from "@mui/material/MenuItem";

interface Vocabulary {
  vocabularyId: string;
  name: string;
  langUse: string;
  langExp: string;
  copyrights: string | null;
  establisher: string;
  wordCount: number;
  createdAt: string;
  isInMyList?: boolean; // 用於 browse 頁面，標記是否已在列表中
}

export default function StudentVocabularyPage() {
  const { data: session } = useSession();
  const [myVocabularies, setMyVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBrowseDialog, setOpenBrowseDialog] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateFormData, setGenerateFormData] = useState({
    name: "",
    langUse: "",
    langExp: "",
    topic: "",
    level: "初級",
  });
  const [selectedVocabulary, setSelectedVocabulary] = useState<Vocabulary | null>(null);
  const [words, setWords] = useState<any[]>([]);
  const [editingWords, setEditingWords] = useState<any[]>([]);
  const [wordsPage, setWordsPage] = useState(0);
  const [wordsPerPage, setWordsPerPage] = useState(50);
  const [wordsTotal, setWordsTotal] = useState(0);
  const [loadingWords, setLoadingWords] = useState(false);
  const [savingWords, setSavingWords] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    langUse: "",
    langExp: "",
    copyrights: "",
  });

  // Browse 相關狀態
  const [browseVocabularies, setBrowseVocabularies] = useState<Vocabulary[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browsePage, setBrowsePage] = useState(0);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseFilters, setBrowseFilters] = useState({
    name: "",
    langUse: [] as string[],
    langExp: [] as string[],
  });

  // OpenAI API key 檢查
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);

  useEffect(() => {
    fetchMyVocabularies();
    checkOpenAIKey();
  }, [page, rowsPerPage]);

  const checkOpenAIKey = async () => {
    try {
      const response = await fetch("/api/check-openai-key");
      if (response.ok) {
        const data = await response.json();
        setHasOpenAIKey(data.hasKey || false);
      }
    } catch (error) {
      console.error("Error checking OpenAI key:", error);
      setHasOpenAIKey(false);
    }
  };

  const fetchMyVocabularies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/student/vocabularies?page=${page}&limit=${rowsPerPage}`
      );
      if (response.ok) {
        const data = await response.json();
        setMyVocabularies(data.vocabularies || []);
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
        `/api/student/vocabularies/${vocabularyId}/words?page=${pageNum}&limit=${wordsPerPage}`
      );
      if (response.ok) {
        const data = await response.json();
        const fetchedWords = data.words || [];
        setWords(fetchedWords);
        setEditingWords(fetchedWords.map((w: any) => ({ ...w })));
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
    // 檢查是否為建立者
    if (vocabulary.establisher !== session?.userId) {
      setError("無權限編輯此單字本");
      return;
    }
    setSelectedVocabulary(vocabulary);
    setFormData({
      name: vocabulary.name,
      langUse: vocabulary.langUse,
      langExp: vocabulary.langExp,
      copyrights: vocabulary.copyrights || "",
    });
    setOpenEditDialog(true);
  };

  const handleSaveVocabulary = async () => {
    if (!selectedVocabulary) return;

    try {
      const response = await fetch(
        `/api/student/vocabularies/${selectedVocabulary.vocabularyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setOpenEditDialog(false);
        fetchMyVocabularies();
        setError("");
      } else {
        const data = await response.json();
        setError(data.error || "更新單字本失敗");
      }
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      setError("更新單字本失敗");
    }
  };

  const handleWordChange = (index: number, field: string, value: string) => {
    const updated = [...editingWords];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setEditingWords(updated);
  };

  const handleSaveWords = async () => {
    if (!selectedVocabulary) return;

    try {
      setSavingWords(true);
      const response = await fetch(
        `/api/student/vocabularies/${selectedVocabulary.vocabularyId}/words`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: editingWords }),
        }
      );

      if (response.ok) {
        await fetchWords(selectedVocabulary.vocabularyId, wordsPage);
        setError("");
        alert("單字儲存成功！");
      } else {
        const data = await response.json();
        setError(data.error || "儲存單字失敗");
      }
    } catch (error) {
      console.error("Error saving words:", error);
      setError("儲存單字失敗");
    } finally {
      setSavingWords(false);
    }
  };

  const handleBrowse = async () => {
    setOpenBrowseDialog(true);
    await fetchBrowseVocabularies(0);
  };

  const fetchBrowseVocabularies = async (pageNum: number = 0) => {
    try {
      setBrowseLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "10");
      
      if (browseFilters.name) {
        params.append("name", browseFilters.name);
      }
      browseFilters.langUse.forEach((lang) => {
        params.append("langUse", lang);
      });
      browseFilters.langExp.forEach((lang) => {
        params.append("langExp", lang);
      });

      const response = await fetch(`/api/student/vocabularies/browse?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBrowseVocabularies(data.vocabularies || []);
        setBrowseTotal(data.total || 0);
        setBrowsePage(pageNum);
      }
    } catch (error) {
      console.error("Error browsing vocabularies:", error);
    } finally {
      setBrowseLoading(false);
    }
  };

  const handleBrowseSearch = () => {
    fetchBrowseVocabularies(0);
  };

  const isOwner = (vocabulary: Vocabulary) => {
    return vocabulary.establisher === session?.userId;
  };

  const handleAddVocabulary = async (vocabulary: Vocabulary) => {
    try {
      const response = await fetch("/api/student/vocabularies/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyId: vocabulary.vocabularyId }),
      });

      if (response.ok) {
        // 更新本地狀態
        vocabulary.isInMyList = true;
        // 刷新我的單字本列表
        fetchMyVocabularies();
        // 刷新 browse 列表
        await fetchBrowseVocabularies(browsePage);
      } else {
        const data = await response.json();
        setError(data.error || "加入單字本失敗");
      }
    } catch (error) {
      console.error("Error adding vocabulary:", error);
      setError("加入單字本失敗");
    }
  };

  const handleRemoveVocabulary = async (vocabulary: Vocabulary) => {
    try {
      const response = await fetch("/api/student/vocabularies/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyId: vocabulary.vocabularyId }),
      });

      if (response.ok) {
        // 更新本地狀態
        vocabulary.isInMyList = false;
        // 刷新我的單字本列表
        fetchMyVocabularies();
        // 刷新 browse 列表
        await fetchBrowseVocabularies(browsePage);
      } else {
        const data = await response.json();
        setError(data.error || "移除單字本失敗");
      }
    } catch (error) {
      console.error("Error removing vocabulary:", error);
      setError("移除單字本失敗");
    }
  };

  const handleGenerateVocabulary = async () => {
    if (
      !generateFormData.name ||
      !generateFormData.langUse ||
      !generateFormData.langExp ||
      !generateFormData.topic ||
      !generateFormData.level
    ) {
      setError("請填寫所有必要欄位");
      return;
    }

    try {
      setGenerating(true);
      setError("");

      const response = await fetch("/api/student/vocabularies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateFormData),
      });

      if (response.ok) {
        const data = await response.json();
        setOpenGenerateDialog(false);
        setGenerateFormData({
          name: "",
          langUse: "",
          langExp: "",
          topic: "",
          level: "初級",
        });
        fetchMyVocabularies();
        alert(`成功生成單字本「${data.vocabulary.name}」，包含 ${data.vocabulary.wordCount} 個單字！`);
      } else {
        const data = await response.json();
        setError(data.error || "生成單字本失敗");
      }
    } catch (error) {
      console.error("Error generating vocabulary:", error);
      setError("生成單字本失敗");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteVocabulary = async (vocabulary: Vocabulary) => {
    // 檢查是否為建立者
    const isOwner = vocabulary.establisher === session?.userId;
    
    if (isOwner) {
      // 是建立者：刪除單字本（包含資料）
      if (!confirm("確定要刪除此單字本嗎？此操作將永久刪除單字本及其所有單字資料，且無法復原。")) {
        return;
      }

      try {
        const response = await fetch(`/api/student/vocabularies/${vocabulary.vocabularyId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchMyVocabularies();
          setError("");
        } else {
          const data = await response.json();
          setError(data.error || "刪除單字本失敗");
        }
      } catch (error) {
        console.error("Error deleting vocabulary:", error);
        setError("刪除單字本失敗");
      }
    } else {
      // 不是建立者：只從列表中移除
      await handleRemoveVocabulary(vocabulary);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">我的單字本</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {hasOpenAIKey && (
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setOpenGenerateDialog(true)}
            >
              AI 生成單字本
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleBrowse}
          >
            瀏覽單字本
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* 上傳區塊 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <VocabularyUpload
            onUploadSuccess={() => {
              fetchMyVocabularies();
            }}
          />
        </CardContent>
      </Card>

      {/* 我的單字本列表 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名稱</TableCell>
              <TableCell>背誦語言</TableCell>
              <TableCell>解釋語言</TableCell>
              <TableCell>單字數</TableCell>
              <TableCell>建立時間</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : myVocabularies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      沒有資料
                    </TableCell>
                  </TableRow>
                ) : (
                  myVocabularies.map((vocabulary) => {
                    const vocabularyIsOwner = isOwner(vocabulary);
                    return (
                      <TableRow key={vocabulary.vocabularyId}>
                        <TableCell>{vocabulary.name}</TableCell>
                        <TableCell>
                          {LANGUAGE_OPTIONS.find((opt) => opt.value === vocabulary.langUse)?.label || vocabulary.langUse}
                        </TableCell>
                        <TableCell>
                          {LANGUAGE_OPTIONS.find((opt) => opt.value === vocabulary.langExp)?.label || vocabulary.langExp}
                        </TableCell>
                        <TableCell>{vocabulary.wordCount}</TableCell>
                        <TableCell>
                          {new Date(vocabulary.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleView(vocabulary)}
                            color="primary"
                            title="查看"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(vocabulary)}
                            color="primary"
                            disabled={!vocabularyIsOwner}
                            title={vocabularyIsOwner ? "編輯" : "無權限編輯"}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteVocabulary(vocabulary)}
                            color="error"
                            title={vocabularyIsOwner ? "刪除單字本" : "從列表中移除"}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        onClose={() => {
          setOpenViewDialog(false);
          setEditingWords([]);
          setError("");
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          查看單字本 - {selectedVocabulary?.name}
        </DialogTitle>
        <DialogContent>
          {selectedVocabulary && (
            <Box sx={{ pt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              <Typography><strong>單字本ID:</strong> {selectedVocabulary.vocabularyId}</Typography>
              <Typography><strong>名稱:</strong> {selectedVocabulary.name}</Typography>
              <Typography><strong>背誦語言:</strong> {LANGUAGE_OPTIONS.find((opt) => opt.value === selectedVocabulary.langUse)?.label || selectedVocabulary.langUse}</Typography>
              <Typography><strong>解釋語言:</strong> {LANGUAGE_OPTIONS.find((opt) => opt.value === selectedVocabulary.langExp)?.label || selectedVocabulary.langExp}</Typography>
              <Typography><strong>版權:</strong> {selectedVocabulary.copyrights || "-"}</Typography>
              <Typography><strong>建立者:</strong> {selectedVocabulary.establisher}</Typography>
              <Typography><strong>單字數:</strong> {selectedVocabulary.wordCount}</Typography>
              
              <Box sx={{ mt: 3 }}>
                {isOwner(selectedVocabulary) && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">單字列表</Typography>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveWords}
                      disabled={savingWords || loadingWords}
                    >
                      {savingWords ? "儲存中..." : "儲存修改"}
                    </Button>
                  </Box>
                )}
                {!isOwner(selectedVocabulary) && (
                  <Typography variant="h6" gutterBottom>單字列表</Typography>
                )}
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
                          {editingWords.map((word, index) => (
                            <TableRow key={word.id || index}>
                              <TableCell>
                                {isOwner(selectedVocabulary) ? (
                                  <TextField
                                    size="small"
                                    value={word.word || ""}
                                    onChange={(e) => handleWordChange(index, "word", e.target.value)}
                                    fullWidth
                                    required
                                  />
                                ) : (
                                  word.word
                                )}
                              </TableCell>
                              <TableCell>
                                {isOwner(selectedVocabulary) ? (
                                  <TextField
                                    size="small"
                                    value={word.spelling || ""}
                                    onChange={(e) => handleWordChange(index, "spelling", e.target.value)}
                                    fullWidth
                                  />
                                ) : (
                                  word.spelling || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isOwner(selectedVocabulary) ? (
                                  <TextField
                                    size="small"
                                    value={word.explanation || ""}
                                    onChange={(e) => handleWordChange(index, "explanation", e.target.value)}
                                    fullWidth
                                    required
                                  />
                                ) : (
                                  word.explanation
                                )}
                              </TableCell>
                              <TableCell>
                                {isOwner(selectedVocabulary) ? (
                                  <TextField
                                    size="small"
                                    value={word.partOfSpeech || ""}
                                    onChange={(e) => handleWordChange(index, "partOfSpeech", e.target.value)}
                                    fullWidth
                                  />
                                ) : (
                                  word.partOfSpeech || "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {isOwner(selectedVocabulary) ? (
                                  <TextField
                                    size="small"
                                    value={word.sentence || ""}
                                    onChange={(e) => handleWordChange(index, "sentence", e.target.value)}
                                    fullWidth
                                    multiline
                                    maxRows={2}
                                  />
                                ) : (
                                  word.sentence || "-"
                                )}
                              </TableCell>
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
                        await fetchWords(selectedVocabulary!.vocabularyId, newPage);
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
          <Button
            onClick={() => {
              setOpenViewDialog(false);
              setEditingWords([]);
              setError("");
            }}
          >
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯對話框 */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>編輯單字本</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="名稱"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <LanguageSelect
              value={formData.langUse}
              onChange={(value) => setFormData({ ...formData, langUse: value as string })}
              label="背誦語言"
              required
            />
            <LanguageSelect
              value={formData.langExp}
              onChange={(value) => setFormData({ ...formData, langExp: value as string })}
              label="解釋語言"
              required
            />
            <TextField
              label="版權"
              value={formData.copyrights}
              onChange={(e) => setFormData({ ...formData, copyrights: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>取消</Button>
          <Button onClick={handleSaveVocabulary} variant="contained">
            儲存
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI 生成單字本對話框 */}
      <Dialog
        open={openGenerateDialog}
        onClose={() => !generating && setOpenGenerateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI 生成單字本</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="單字本名稱"
              value={generateFormData.name}
              onChange={(e) =>
                setGenerateFormData({ ...generateFormData, name: e.target.value })
              }
              fullWidth
              required
              disabled={generating}
            />
            <LanguageSelect
              value={generateFormData.langUse}
              onChange={(value) =>
                setGenerateFormData({
                  ...generateFormData,
                  langUse: value as string,
                })
              }
              label="背誦語言"
              required
              disabled={generating}
              allowedLanguages={["Japanese", "Traditional Chinese", "English"]}
            />
            <LanguageSelect
              value={generateFormData.langExp}
              onChange={(value) =>
                setGenerateFormData({
                  ...generateFormData,
                  langExp: value as string,
                })
              }
              label="解釋語言"
              required
              disabled={generating}
              allowedLanguages={["Japanese", "Traditional Chinese", "English"]}
            />
            <TextField
              label="主題"
              value={generateFormData.topic}
              onChange={(e) =>
                setGenerateFormData({
                  ...generateFormData,
                  topic: e.target.value,
                })
              }
              fullWidth
              required
              placeholder="例如：日常用語、商務英語、旅遊日語等"
              disabled={generating}
              multiline
              rows={2}
            />
            <TextField
              select
              label="程度"
              value={generateFormData.level}
              onChange={(e) =>
                setGenerateFormData({
                  ...generateFormData,
                  level: e.target.value,
                })
              }
              fullWidth
              required
              disabled={generating}
              helperText="僅三選一：初級、中級、高級（影響詞彙難度）"
            >
              {["初級", "中級", "高級"].map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  {lvl}
                </MenuItem>
              ))}
            </TextField>
            <Alert severity="info">
              單字數量預設 30，若少於 25 會自動補齊；僅支援日文 / 繁體中文 / 英文。
            </Alert>
            {generating && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  AI 正在生成單字本，請稍候...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenGenerateDialog(false)}
            disabled={generating}
          >
            取消
          </Button>
          <Button
            onClick={handleGenerateVocabulary}
            variant="contained"
            disabled={
              generating ||
              !generateFormData.name ||
              !generateFormData.langUse ||
              !generateFormData.langExp ||
              !generateFormData.topic
            }
            startIcon={generating ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
          >
            {generating ? "生成中..." : "生成"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 瀏覽對話框 */}
      <Dialog
        open={openBrowseDialog}
        onClose={() => setOpenBrowseDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>瀏覽單字本</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="名稱"
                  value={browseFilters.name}
                  onChange={(e) =>
                    setBrowseFilters({ ...browseFilters, name: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LanguageSelect
                  value={browseFilters.langUse}
                  onChange={(value) =>
                    setBrowseFilters({ ...browseFilters, langUse: value as string[] })
                  }
                  label="背誦語言"
                  multiple
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LanguageSelect
                  value={browseFilters.langExp}
                  onChange={(value) =>
                    setBrowseFilters({ ...browseFilters, langExp: value as string[] })
                  }
                  label="解釋語言"
                  multiple
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleBrowseSearch}
              sx={{ mb: 2 }}
            >
              搜尋
            </Button>

            {browseLoading ? (
              <CircularProgress />
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>名稱</TableCell>
                        <TableCell>背誦語言</TableCell>
                        <TableCell>解釋語言</TableCell>
                        <TableCell>單字數</TableCell>
                        <TableCell>建立者</TableCell>
                        <TableCell align="right">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {browseVocabularies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            沒有找到符合條件的單字本
                          </TableCell>
                        </TableRow>
                      ) : (
                        browseVocabularies.map((vocabulary) => (
                          <TableRow key={vocabulary.vocabularyId}>
                            <TableCell>{vocabulary.name}</TableCell>
                            <TableCell>
                              {LANGUAGE_OPTIONS.find((opt) => opt.value === vocabulary.langUse)?.label || vocabulary.langUse}
                            </TableCell>
                            <TableCell>
                              {LANGUAGE_OPTIONS.find((opt) => opt.value === vocabulary.langExp)?.label || vocabulary.langExp}
                            </TableCell>
                            <TableCell>{vocabulary.wordCount}</TableCell>
                            <TableCell>{vocabulary.establisher}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setOpenBrowseDialog(false);
                                  handleView(vocabulary);
                                }}
                                color="primary"
                                title="查看"
                              >
                                <VisibilityIcon />
                              </IconButton>
                              {isOwner(vocabulary) && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setOpenBrowseDialog(false);
                                    handleEdit(vocabulary);
                                  }}
                                  color="primary"
                                  title="編輯"
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                              {vocabulary.isInMyList ? (
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveVocabulary(vocabulary)}
                                  color="error"
                                  title="從列表中移除"
                                >
                                  <RemoveIcon />
                                </IconButton>
                              ) : (
                                <IconButton
                                  size="small"
                                  onClick={() => handleAddVocabulary(vocabulary)}
                                  color="success"
                                  title="加入單字本"
                                >
                                  <AddIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={browseTotal}
                  page={browsePage}
                  onPageChange={(e, newPage) => fetchBrowseVocabularies(newPage)}
                  rowsPerPage={10}
                  rowsPerPageOptions={[10]}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBrowseDialog(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
