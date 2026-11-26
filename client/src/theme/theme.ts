import { createTheme } from '@mui/material/styles';
import { brand } from './palette';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.navy, contrastText: brand.white },
    secondary: { main: brand.teal, dark: brand.tealDark, contrastText: brand.navy },
    success: { main: brand.tealDark },
    warning: { main: brand.warning },
    error: { main: brand.danger },
    background: { default: brand.white, paper: brand.white },
    text: { primary: brand.navy, secondary: brand.navySoft },
    divider: brand.mist,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Inter Tight Variable", "Segoe UI", system-ui, sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1.02 },
    h2: { fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08 },
    h3: { fontWeight: 600, letterSpacing: '-0.03em' },
    h4: { fontWeight: 600, letterSpacing: '-0.025em' },
    h5: { fontWeight: 600, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20, minHeight: 40 },
        sizeLarge: { minHeight: 52, paddingInline: 28, fontSize: 16 },
        outlined: { borderColor: brand.mist, '&:hover': { borderColor: brand.sage, backgroundColor: brand.mist } },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: brand.mist } } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 18, borderColor: brand.mist } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.mist },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand.sage },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 22 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiLink: { defaultProps: { underline: 'hover' } },
  },
});
