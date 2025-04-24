import { AppBar, Toolbar, Typography, IconButton, Avatar, Tooltip, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Example Gemini-like icon
import { useNavigate } from 'react-router-dom';

export default function ChatHeader() {
  const navigate = useNavigate();

  return (
    // Use position="sticky" if you want it to stick while potentially scrolling other page content
    // For a full-height chat, position="static" or default is fine.
    <AppBar position="static" elevation={0} >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
           <Avatar sx={{ bgcolor: 'primary.main' }}>
             <SmartToyIcon fontSize="small" />
           </Avatar>
           <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
             Gemini Chat
           </Typography>
        </Box>

        <Tooltip title="Settings">
          <IconButton color="inherit" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}