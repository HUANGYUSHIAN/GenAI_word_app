import { MenuItem, TextField } from "@mui/material";

const LANGS = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

export default function LanguageSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {LANGS.map((l) => (
        <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
      ))}
    </TextField>
  );
}

export { LANGS };


