import { Box, Button, Container, Typography } from "@mui/material";
import { Routes, Route, useNavigate } from "react-router-dom";
import VocabularyUpload from "./VocabularyUpload";
import UserManage from "./UserManage";
import CouponManage from "./CouponManage";

export default function AdminPage() {
  const navigate = useNavigate();
  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Admin</Typography>
      <Box display="flex" gap={2} mb={3}>
        <Button variant="outlined" onClick={() => navigate("vocabulary")}>Vocabulary</Button>
        <Button variant="outlined" onClick={() => navigate("setting")}>Setting</Button>
        <Button variant="outlined" onClick={() => navigate("user")}>User</Button>
        <Button variant="outlined" onClick={() => navigate("coupon")}>Coupon</Button>
      </Box>
      <Routes>
        <Route path="vocabulary" element={<VocabularyUpload />} />
        <Route path="setting" element={<BlankPage title="Setting" />} />
        <Route path="user" element={<UserManage />} />
        <Route path="coupon" element={<CouponManage />} />
        <Route path="*" element={<BlankPage title="Dashboard" />} />
      </Routes>
    </Container>
  );
}

function BlankPage({ title }: { title: string }) {
  return <Box p={4} sx={{ backgroundColor: "#fff" }}>{title}</Box>;
}

