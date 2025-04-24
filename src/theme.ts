import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { deepPurple, grey } from '@mui/material/colors';

// Define your color palette
const primaryColor = deepPurple[500]; // Example: A nice purple
const secondaryColor = grey[700];
const backgroundColor = grey[50]; // Light grey background
const paperColor = '#ffffff';
const userBubbleColor = primaryColor;
const modelBubbleColor = grey[200];

let theme = createTheme({
  palette: {
    primary: {
      main: primaryColor,
      contrastText: '#ffffff',
    },
    secondary: {
      main: secondaryColor,
    },
    background: {
      default: backgroundColor,
      paper: paperColor,
    },
    text: {
      primary: grey[900],
      secondary: grey[600],
    },
    // Custom colors for chat bubbles
    userBubble: {
      main: userBubbleColor,
      contrastText: '#ffffff',
    },
    modelBubble: {
      main: modelBubbleColor,
      contrastText: grey[900],
    },
    // Define divider color based on background
    divider: grey[300],
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Or choose another font
    h6: {
      fontWeight: 600,
    },
    // Add more customizations as needed
  },
  shape: {
    borderRadius: 8, // Slightly more rounded corners globally
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          // Default paper styles if needed
        },
      },
    },
    MuiButton: {
        styleOverrides: {
            root: {
                textTransform: 'none', // Keep button text casing as is
                borderRadius: '18px', // Pill-shaped buttons
                padding: '8px 16px',
            },
            containedPrimary: {
                boxShadow: '0 4px 12px -4px rgba(102, 18, 247, 0.4)', // Subtle shadow for primary buttons
                '&:hover': {
                    boxShadow: '0 6px 16px -6px rgba(102, 18, 247, 0.6)',
                }
            }
        }
    },
    MuiTextField: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                     borderRadius: '12px', // Rounded input fields
                    //  backgroundColor: paperColor, // Ensure background contrasts if needed
                     '& fieldset': {
                        // borderColor: grey[300], // Subtle border
                     },
                    '&:hover fieldset': {
                        // borderColor: primaryColor, // Border color on hover
                    },
                    '&.Mui-focused fieldset': {
                        // borderColor: primaryColor, // Border color when focused
                        // borderWidth: '1px',
                    },
                },
            },
        },
    },
     MuiAppBar: {
        styleOverrides: {
            root: {
                 backgroundColor: paperColor, // White AppBar
                 color: grey[800], // Dark text on white AppBar
                 boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // Subtle shadow
                 // borderBottom: `1px solid ${grey[300]}`, // Or a border
            }
        }
     }
  },
});

// Add responsive font sizes
theme = responsiveFontSizes(theme);

// Extend Theme type for custom colors (TypeScript specific)
declare module '@mui/material/styles' {
  interface Palette {
    userBubble: Palette['primary'];
    modelBubble: Palette['primary'];
  }
  interface PaletteOptions {
    userBubble?: PaletteOptions['primary'];
    modelBubble?: PaletteOptions['primary'];
  }
}


export default theme;