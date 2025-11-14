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

interface LanguageSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label: string;
  required?: boolean;
  multiple?: boolean;
  fullWidth?: boolean;
}

export default function LanguageSelect({
  value,
  onChange,
  label,
  required = false,
  multiple = false,
  fullWidth = true,
}: LanguageSelectProps) {
  const handleChange = (event: SelectChangeEvent<string | string[]>) => {
    const newValue = event.target.value;
    onChange(newValue);
  };

  return (
    <FormControl fullWidth={fullWidth} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={handleChange}
        multiple={multiple}
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
        {LANGUAGE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

