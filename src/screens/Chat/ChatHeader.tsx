import { AppBar, Toolbar, Typography, IconButton, Avatar, Tooltip, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Example Gemini-like icon
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  onMenuClick?: () => void;
}
export default function ChatHeader({ onMenuClick }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <AppBar position="static" elevation={0} >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {onMenuClick && (
          <Tooltip title="Hystory Bar">
            <IconButton edge="start" color="inherit" onClick={onMenuClick} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
          )}
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