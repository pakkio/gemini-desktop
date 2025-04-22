import { Box, Paper } from '@mui/material';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'model' | 'system' | 'tool';
  parts: { text: string }[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: inputValue.trim() }],
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyForBackend = messages.filter(m => m.role === 'user' || m.role === 'model');
      const { data } = await axios.post('http://localhost:5001/api/chat', {
        message: newUserMessage.parts[0].text,
        history: historyForBackend,
      });

      if (data?.reply) {
        const assistantMessage: ChatMessage = {
          role: 'model',
          parts: [{ text: data.reply }],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [...prev, {
          role: 'system',
          parts: [{ text: 'No reply from assistant.' }],
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'system',
        parts: [{ text: 'Error: Failed to fetch response.' }],
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // <Box  height="100vh"  width="100%" display="flex" flexDirection="row">
    <Box  height="100vh"  width="100%" display="flex" flexDirection="column">
      <ChatHeader />
      <Box flexGrow={1} overflow="hidden" display="flex" flexDirection="column" p={2}>
      <Paper  elevation={3} sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>

          <MessageList messages={messages} messagesEndRef={messagesEndRef} isLoading={isLoading} />
        </Paper>
        <Box mt={2}>
          <MessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSubmit={sendMessage}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Box>
    // <Box  height="100vh" bgcolor={'red'}  width="100%" display="flex" flexDirection="column">

    // </Box>
    // </Box>

  );
}
