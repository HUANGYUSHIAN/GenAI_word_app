import { Box, Button } from "@mui/material";
import { useNavigate, Routes, Route } from "react-router-dom";

export default function SupplierHome() {
  const nav = useNavigate();
  return (
    <Box p={4} sx={{ backgroundColor: "#fff" }}>
      <Button onClick={() => nav("setting")}>Setting</Button>
      <Button onClick={() => nav("coupon")}>Coupon</Button>
      <Button onClick={() => nav("store")}>Store</Button>
      <Routes>
        <Route path="setting" element={<Blank title="Supplier Setting" />} />
        <Route path="coupon" element={<Blank title="Supplier Coupon" />} />
        <Route path="store" element={<Blank title="Supplier Store" />} />
      </Routes>
    </Box>
  );
}

function Blank({ title }: { title: string }) {
  return <Box p={2}>{title}</Box>;
}

