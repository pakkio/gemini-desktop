import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from './screens/Chat/ChatPage';
import SettingsPage from './screens/McpSettingsPage/McpSettingsPage';
import ServerConfiguration from './screens/ServerConfiguration/ServerConfiguration';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/server-config" element={<ServerConfiguration />} />
      </Routes>
    </Router>
  );
}
