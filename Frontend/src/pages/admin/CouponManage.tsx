import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { api } from "../../api/client";

export default function CouponManage(){
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const res = await api.get("/coupons");
    setList(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Coupons</Typography>
        <Button variant="contained" onClick={() => { setEditing({}); setOpen(true); }}>New Coupon</Button>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Text</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Link</TableCell>
              <TableCell align="right">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.text}</TableCell>
                <TableCell>{c.period ? new Date(c.period).toISOString().slice(0,10) : ""}</TableCell>
                <TableCell>{c.link}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={async () => {
                    const full = await api.get(`/coupons/${c.id}`);
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
      await api.post(`/coupons`, form);
    } else {
      await api.put(`/coupons/${form.id}`, form);
    }
    onSaved();
  };
  const del = async () => {
    if (!form?.id) return onClose();
    await api.delete(`/coupons/${form.id}`);
    onDeleted();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew?"New Coupon":"Coupon #"+form.id}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField label="Text" value={form.text||""} onChange={(e)=>setForm({...form,text:e.target.value})} />
          <TextField label="Period (YYYY-MM-DD)" value={form.period||""} onChange={(e)=>setForm({...form,period:e.target.value})} />
          <TextField label="Link" value={form.link||""} onChange={(e)=>setForm({...form,link:e.target.value})} />
          <TextField label="SupplierId" value={form.supplierId||""} onChange={(e)=>setForm({...form,supplierId:Number(e.target.value)||null})} />
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

