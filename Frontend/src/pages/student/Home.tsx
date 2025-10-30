import { Box, Button } from "@mui/material";
import { useNavigate, Routes, Route } from "react-router-dom";

export default function StudentHome() {
  const nav = useNavigate();
  return (
    <Box p={4} sx={{ backgroundColor: "#fff" }}>
      <Button onClick={() => nav("vocabulary")}>Vocabulary</Button>
      <Button onClick={() => nav("store")}>Store</Button>
      <Button onClick={() => nav("setting")}>Setting</Button>
      <Button onClick={() => nav("game")}>Game</Button>
      <Button onClick={() => nav("review")}>Review</Button>
      <Routes>
        <Route path="vocabulary" element={<Blank title="Student Vocabulary" />} />
        <Route path="store" element={<Blank title="Student Store" />} />
        <Route path="setting" element={<Blank title="Student Setting" />} />
        <Route path="game" element={<Blank title="Student Game" />} />
        <Route path="review" element={<Blank title="Student Review" />} />
      </Routes>
    </Box>
  );
}

function Blank({ title }: { title: string }) {
  return <Box p={2}>{title}</Box>;
}

