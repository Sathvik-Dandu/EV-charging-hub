import type { ChangeEvent } from 'react';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

export default function PhoneField({ onChange, ...props }: TextFieldProps) {
  const digitsOnly = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange?.(e);
  };

  return (
    <TextField
      {...props}
      onChange={digitsOnly}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> },
        htmlInput: { inputMode: 'numeric', maxLength: 10 },
      }}
    />
  );
}
