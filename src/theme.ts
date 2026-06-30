import { createTheme } from '@mui/material/styles';
import { blueGrey, indigo } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: indigo[700],
      light: indigo[400],
      dark: indigo[900],
    },
    secondary: {
      main: blueGrey[600],
    },
    background: {
      default: blueGrey[50],
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: blueGrey[50],
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: indigo[900],
          color: '#ffffff',
        },
      },
    },
  },
});

export default theme;
