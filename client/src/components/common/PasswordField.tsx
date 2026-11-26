import { useState } from 'react';
import { Box, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography, type TextFieldProps } from '@mui/material';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import { PASSWORD_RULES } from '../../schemas/forms';

type Props = TextFieldProps & { rulesFor?: string };

export default function PasswordField({ rulesFor, onChange, onFocus, onBlur, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);

  return (
    <Box>
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        onChange={(e) => {
          setFilled(e.target.value !== '');
          onChange?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        slotProps={{
          inputLabel: { shrink: focused || filled || !!rulesFor },
          input: {
            notched: focused || filled || !!rulesFor,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={visible ? 'Hide password' : 'Show password'}>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label={visible ? 'hide password' : 'show password'}
                    onClick={() => setVisible((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {visible ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
      {rulesFor !== undefined && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25, mt: 0.75, px: 0.5 }}>
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(rulesFor);
            return (
              <Stack key={rule.label} direction="row" spacing={0.5} sx={{ alignItems: 'center', color: ok ? 'success.main' : 'text.secondary' }}>
                {ok ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <RadioButtonUncheckedRounded sx={{ fontSize: 14 }} />}
                <Typography variant="caption">{rule.label}</Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
