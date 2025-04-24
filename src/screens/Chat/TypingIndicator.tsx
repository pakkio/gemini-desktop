import { Box, Avatar, Paper, keyframes, useTheme } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Or your preferred bot icon

// Keyframes for the dot animation
const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
`;

const TypingIndicator = () => {
    const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', mb: 0.5 }}>
         <SmartToyIcon fontSize="small" />
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: '12px 14px', // Match bubble padding
          bgcolor: 'modelBubble.main', // Match model bubble background
          color: 'modelBubble.contrastText',
          borderRadius: '20px 20px 20px 5px', // Match model bubble shape
          display: 'flex',
          alignItems: 'center',
          minHeight: '24px', // Ensure consistent height
        }}
      >
        {/* Animated dots */}
        <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              component="span"
              sx={{
                width: 8,
                height: 8,
                bgcolor: 'currentColor', // Use Paper's text color
                borderRadius: '50%',
                display: 'inline-block',
                animation: `${bounce} 1.4s infinite ease-in-out both`,
                animationDelay: `${i * 0.16}s`, // Stagger animation
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default TypingIndicator;