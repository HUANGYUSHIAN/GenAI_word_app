import { useEffect, useState } from "react";
import { Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Pagination, Snackbar, Alert, Grid, Card, CardContent, CardHeader, Divider } from "@mui/material";
import { api } from "../../api/client";
import LanguageSelect from "../../components/LanguageSelect";
import EditIcon from "@mui/icons-material/Edit";

type Word = { word: string; spelling?: string | null; explanation?: string | null; partOfSpeech?: string | null; sentence?: string | null };

export default function VocabularyUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [langUse, setLangUse] = useState("en");
  const [langExp, setLangExp] = useState("zh-TW");
  const [copyrights, setCopyrights] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  useEffect(() => {
    (async () => {
      const res = await api.get("/vocabulary");
      setList(res.data);
    })();
  }, []);

  const fetchList = async () => {
    const res = await api.get("/vocabulary");
    setList(res.data);
  };

  const upload = async () => {
    setMessage(null);
    if (!file) return setMessage("Please choose a .csv or .xlsx file");
    const fd = new FormData();
    fd.append("file", file);
    const params = new URLSearchParams({ name, langUse, langExp, copyrights });
    const res = await api.post(`/vocabulary/upload?${params.toString()}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    setMessage(`Uploaded vocabulary ${res.data.name} with ${res.data.words} words`);
    await fetchList();
  };

  // Manual add/edit removed as requested

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card elevation={3}>
            <CardHeader title="Upload Vocabulary" subheader="CSV 或 XLSX 檔案" />
            <CardContent>
              <Box display="flex" gap={2} mb={2}>
                <TextField fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              </Box>
              <Box display="flex" gap={2} mb={2}>
                <LanguageSelect label="LangUse" value={langUse} onChange={setLangUse} />
                <LanguageSelect label="LangExp" value={langExp} onChange={setLangExp} />
              </Box>
              <Box display="flex" gap={2} mb={2}>
                <TextField fullWidth label="Copyrights" value={copyrights} onChange={(e) => setCopyrights(e.target.value)} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" gap={2} alignItems="center">
                <Button variant="outlined" component="label">
                  Choose .csv/.xlsx
                  <input hidden type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </Button>
                {file && <Typography>{file.name}</Typography>}
                <Box flexGrow={1} />
                <Button variant="contained" onClick={upload}>Upload</Button>
              </Box>
              {message && <Typography sx={{ mt: 2 }}>{message}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card elevation={3}>
            <CardHeader title="Existing Vocabularies" subheader="點擊右側圖示以編輯" />
            <CardContent>
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>LangUse</TableCell>
                      <TableCell>LangExp</TableCell>
                      <TableCell>Copyrights</TableCell>
                      <TableCell align="right">Edit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell>{v.id}</TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.langUse}</TableCell>
                        <TableCell>{v.langExp}</TableCell>
                        <TableCell>{v.copyrights}</TableCell>
                        <TableCell align="right">
                          <IconButton onClick={async () => {
                            setEditLoading(true);
                            const full = await api.get(`/vocabulary/${v.id}`);
                            const data = full.data;
                            setEditing({ ...data });
                            setOpenEdit(true);
                            setEditLoading(false);
                          }} size="small"><EditIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
              {editLoading && <Box mt={2} display="flex" alignItems="center" gap={1}><CircularProgress size={20} /> <Typography>Loading vocabulary...</Typography></Box>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {editLoading && <Box mt={2} display="flex" alignItems="center" gap={1}><CircularProgress size={20} /> <Typography>Loading vocabulary...</Typography></Box>}

      <EditDialog open={openEdit} onClose={() => setOpenEdit(false)} data={editing} onSaved={async (nv) => {
        setOpenEdit(false);
        await fetchList();
        setToast({ open: true, text: "檔案覆蓋成功" });
      }} onDeleted={async (_id) => {
        setOpenEdit(false);
        await fetchList();
      }} />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast({ open: false, text: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setToast({ open: false, text: "" })} severity="success" sx={{ width: "100%" }}>
          {toast.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function EditDialog({ open, onClose, data, onSaved, onDeleted }: { open: boolean; onClose: () => void; data: any; onSaved: (v:any)=>void; onDeleted: (id:number)=>void }) {
  const [form, setForm] = useState<any>(data || {});
  const [page, setPage] = useState(1);
  const pageSize = 50;
  useEffect(() => { setForm(data || {}); setPage(1); }, [data]);
  if (!data) return null;
  const save = async () => {
    const res = await api.put(`/vocabulary/${data.id}`, form);
    onSaved(res.data);
  };
  const del = async () => {
    await api.delete(`/vocabulary/${data.id}`);
    onDeleted(data.id);
  };
  const words: any[] = Array.isArray(form.words) ? form.words : [];
  const totalPages = Math.max(1, Math.ceil(words.length / pageSize));
  const start = (page - 1) * pageSize;
  const visible = words.slice(start, start + pageSize);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Vocabulary #{data.id}</DialogTitle>
      <DialogContent>
        <Box display="flex" gap={2} mt={1}>
          <TextField label="Name" fullWidth value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} />
          <LanguageSelect label="LangUse" value={form.langUse||""} onChange={(v)=>setForm({...form,langUse:v})} />
          <LanguageSelect label="LangExp" value={form.langExp||""} onChange={(v)=>setForm({...form,langExp:v})} />
          <TextField label="Copyrights" value={form.copyrights||""} onChange={(e)=>setForm({...form,copyrights:e.target.value})} />
        </Box>
        <Box display="flex" gap={2} mt={2}>
          <TextField label="EstablisherUserId" value={form.establisherUserId||""} InputProps={{ readOnly: true }} />
          <TextField label="Establisher" value={form.establisher?.name||""} InputProps={{ readOnly: true }} />
        </Box>
        <Box mt={2}>
          <Typography variant="subtitle1">Words</Typography>
          <Paper sx={{ maxHeight: 400, overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Word</TableCell>
                  <TableCell>Spelling</TableCell>
                  <TableCell>Explanation</TableCell>
                  <TableCell>PartOfSpeech</TableCell>
                  <TableCell>Sentence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((w:any, i:number) => {
                  const absoluteIndex = start + i;
                  return (
                    <TableRow key={absoluteIndex}>
                      <TableCell><TextField size="small" value={w.word||""} onChange={(e)=>updateWord(form, setForm, absoluteIndex, "word", e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" value={w.spelling||""} onChange={(e)=>updateWord(form, setForm, absoluteIndex, "spelling", e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" value={w.explanation||""} onChange={(e)=>updateWord(form, setForm, absoluteIndex, "explanation", e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" value={w.partOfSpeech||""} onChange={(e)=>updateWord(form, setForm, absoluteIndex, "partOfSpeech", e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" value={w.sentence||""} onChange={(e)=>updateWord(form, setForm, absoluteIndex, "sentence", e.target.value)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
          {totalPages > 1 && (
            <Box display="flex" justifyContent="flex-end" mt={1}>
              <Pagination count={totalPages} page={page} onChange={(_e, v)=>setPage(v)} size="small" />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={del}>Delete</Button>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function updateWord(form:any, setForm:any, i:number, key:string, value:any){
  const words = [...(form.words||[])];
  words[i] = { ...(words[i]||{}), [key]: value };
  setForm({ ...form, words });
}

function parseSentences(value:any){
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string"){
    try { return JSON.parse(value); } catch { return value.split(/;|\n/).map((s)=>s.trim()).filter(Boolean); }
  }
  return [];
}

