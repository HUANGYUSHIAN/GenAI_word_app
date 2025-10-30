import { useState } from "react";
import { Box, Button, Container, Tab, Tabs, TextField, MenuItem, Typography } from "@mui/material";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import LanguageSelect from "../../components/LanguageSelect";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [tab, setTab] = useState(0);
  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
        <Tab label="Login" />
        <Tab label="Register" />
      </Tabs>
      <Box sx={{ mt: 3 }}>{tab === 0 ? <LoginForm /> : <RegisterForm />}</Box>
    </Container>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const submit = async () => {
    setError(null);
    try {
      await api.post("/auth/login", { email, password });
      await refresh();
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Login failed");
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <Typography color="error">{error}</Typography>}
      <Button variant="contained" onClick={submit}>Login</Button>
    </Box>
  );
}

function RegisterForm() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("zh-TW");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const submit = async () => {
    setError(null);
    try {
      await api.post("/auth/register", { role, email, phoneNumber, birthday, name, password, language });
      // auto-login
      await api.post("/auth/login", { email, password });
      await refresh();
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Registration failed");
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
        <MenuItem value="student">Student</MenuItem>
        <MenuItem value="supplier">Supplier</MenuItem>
      </TextField>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      <TextField label="Birthday (YYYY-MM-DD)" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <LanguageSelect label="Language" value={language} onChange={setLanguage} />
      {error && <Typography color="error">{error}</Typography>}
      <Button variant="contained" onClick={submit}>Register</Button>
    </Box>
  );
}

