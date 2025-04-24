import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from './screens/Chat/ChatPage';
import SettingsPage from './screens/McpSettingsPage/McpSettingsPage';
import ServerConfiguration from './screens/ServerConfiguration/ServerConfiguration';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
     <CssBaseline />
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/server-config" element={<ServerConfiguration />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}
