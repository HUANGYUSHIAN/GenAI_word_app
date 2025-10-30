import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { api } from "../../api/client";
import LanguageSelect from "../../components/LanguageSelect";

export default function UserManage(){
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const res = await api.get("/users");
    setList(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Users</Typography>
        <Button variant="contained" onClick={() => { setEditing({ role: "STUDENT", language: "zh-TW" }); setOpen(true); }}>New User</Button>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Locked</TableCell>
              <TableCell align="right">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.isLocked ? "Yes" : "No"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={async () => {
                    const full = await api.get(`/users/${u.id}`);
                    setEditing(full.data); setOpen(true);
                  }}><EditIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <EditDialog open={open} data={editing} onClose={() => setOpen(false)} onSaved={async() => { setOpen(false); await load(); }} onDeleted={async() => { setOpen(false); await load(); }} />
    </Box>
  );
}

function EditDialog({ open, data, onClose, onSaved, onDeleted }:{ open: boolean; data: any; onClose:()=>void; onSaved:()=>void; onDeleted:()=>void }){
  const [form, setForm] = useState<any>(data||{});
  useEffect(()=>{ setForm(data||{}); }, [data]);
  if (!open) return null;
  const isNew = !form?.id;
  const save = async () => {
    if (isNew) {
      await api.post(`/users`, form);
    } else {
      await api.put(`/users/${form.id}`, form);
    }
    onSaved();
  };
  const del = async () => {
    if (!form?.id) return onClose();
    await api.delete(`/users/${form.id}`);
    onDeleted();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew?"New User":"User #"+form.id}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField label="Name" value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} />
          <TextField label="Email" value={form.email||""} onChange={(e)=>setForm({...form,email:e.target.value})} disabled={!isNew} />
          {isNew && <TextField label="Password" type="password" value={form.password||""} onChange={(e)=>setForm({...form,password:e.target.value})} />}
          <TextField select label="Role" value={form.role||"STUDENT"} onChange={(e)=>setForm({...form,role:e.target.value})}>
            <MenuItem value="STUDENT">STUDENT</MenuItem>
            <MenuItem value="SUPPLIER">SUPPLIER</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </TextField>
          <LanguageSelect label="Language" value={form.language||"zh-TW"} onChange={(v)=>setForm({...form,language:v})} />
          <TextField label="Phone" value={form.phoneNumber||""} onChange={(e)=>setForm({...form,phoneNumber:e.target.value})} />
          <TextField label="Birthday (YYYY-MM-DD)" value={form.birthday||""} onChange={(e)=>setForm({...form,birthday:e.target.value})} />
          {!isNew && <TextField select label="Locked" value={form.isLocked?"yes":"no"} onChange={(e)=>setForm({...form,isLocked:e.target.value==="yes"})}>
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
          </TextField>}
        </Box>
      </DialogContent>
      <DialogActions>
        {!isNew && <Button color="error" onClick={del}>Delete</Button>}
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

