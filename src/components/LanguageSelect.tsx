"use client";

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Box,
} from "@mui/material";

export const LANGUAGE_OPTIONS = [
  { value: "Japanese", label: "日文" },
  { value: "Korean", label: "韓文" },
  { value: "English", label: "英文" },
  { value: "Traditional Chinese", label: "繁體中文" },
];

export function getLanguageLabel(langCode: string): string {
  const option = LANGUAGE_OPTIONS.find(opt => opt.value === langCode)
  return option?.label || langCode
}

interface LanguageSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label: string;
  required?: boolean;
  multiple?: boolean;
  fullWidth?: boolean;
  allowedLanguages?: string[];
  disabled?: boolean;
}

export default function LanguageSelect({
  value,
  onChange,
  label,
  required = false,
  multiple = false,
  fullWidth = true,
  allowedLanguages,
  disabled = false,
}: LanguageSelectProps) {
  const handleChange = (event: SelectChangeEvent<string | string[]>) => {
    const newValue = event.target.value;
    onChange(newValue);
  };

  const options = allowedLanguages
    ? LANGUAGE_OPTIONS.filter((opt) => allowedLanguages.includes(opt.value))
    : LANGUAGE_OPTIONS;

  return (
    <FormControl fullWidth={fullWidth} required={required} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={handleChange}
        multiple={multiple}
        disabled={disabled}
        renderValue={
          multiple
            ? (selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((val) => {
                    const option = LANGUAGE_OPTIONS.find((opt) => opt.value === val);
                    return <Chip key={val} label={option?.label || val} size="small" />;
                  })}
                </Box>
              )
            : undefined
        }
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

