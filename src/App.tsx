import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from './screens/Chat/ChatPage';
import SettingsPage from './screens/McpSettingsPage/McpSettingsPage';
import ServerConfiguration from './screens/ServerConfiguration/ServerConfiguration';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
     <CssBaseline />
     <ToastContainer
        position="top-right" // Where the toasts appear
        autoClose={5000} // Auto close after 5 seconds
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" // 'light', 'dark', or 'colored'
      />
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
