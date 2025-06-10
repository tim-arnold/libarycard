import { createTheme, ThemeOptions } from '@mui/material/styles'

const commonTypography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    '"Fira Sans"',
    '"Droid Sans"',
    '"Helvetica Neue"',
    'sans-serif',
  ].join(','),
}

const commonComponents = {
  MuiContainer: {
    styleOverrides: {
      root: ({ theme }: { theme: any }) => ({
        paddingLeft: '0 !important',
        paddingRight: '0 !important',
        [theme.breakpoints.up('md')]: {
          paddingLeft: '24px !important',
          paddingRight: '24px !important',
        },
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.375rem',
        textTransform: 'none' as const,
        fontWeight: 500,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '0.25rem',
        },
      },
    },
  },
}

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#673ab7', // Deep Purple
      light: '#9c27b0',
      dark: '#512da8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e1bee7', // Light Purple (complementary)
      light: '#f3e5f5',
      dark: '#ce93d8',
      contrastText: '#000000',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: commonTypography,
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
        },
      },
    },
  },
}

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#bb86fc', // More accessible purple for dark mode
      light: '#d1c4e9',
      dark: '#9c27b0',
      contrastText: '#000000', // Better contrast with the lighter purple
    },
    secondary: {
      main: '#ce93d8', // Darker purple for dark mode
      light: '#e1bee7',
      dark: '#ab47bc',
      contrastText: '#000000',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#64b5f6', // Lighter for better contrast in dark mode
      light: '#90caf9',
      dark: '#42a5f5',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)', // Increased contrast
      secondary: 'rgba(255, 255, 255, 0.75)', // Increased contrast for better readability
    },
  },
  typography: commonTypography,
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          backgroundColor: '#2e2e2e', // Lighter background for better contrast with page
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          border: '1px solid #333333',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#bb86fc', // Light purple for better contrast in dark mode
          '&:hover': {
            color: '#d1c4e9', // Lighter on hover
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          ...commonComponents.MuiButton.styleOverrides.root,
        },
        text: {
          color: '#bb86fc', // Light purple for text buttons in dark mode
          '&:hover': {
            backgroundColor: 'rgba(187, 134, 252, 0.08)',
            color: '#d1c4e9',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.3)',
          color: 'rgba(255, 255, 255, 0.85)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e1e1e', // Ensure dialog has proper dark background
          color: 'rgba(255, 255, 255, 0.95)', // Ensure text is white in dark mode
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.95)', // Ensure title text is white
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.95)', // Ensure content text is white
        },
      },
    },
  },
}

export const lightTheme = createTheme(lightThemeOptions)
export const darkTheme = createTheme(darkThemeOptions)

// Export default theme for backwards compatibility
export const theme = lightTheme

export function createAppTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme
}