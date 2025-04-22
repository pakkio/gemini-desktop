import { ChatMessage } from './types/types'; 
import MessageItem from './MessageItem';
import { Box, Typography } from '@mui/material';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList = ({ messages, isLoading, messagesEndRef }: Props) => (
    <Box display="flex" flexDirection="column" gap={2}>
      {messages.map((msg, i) => (
        <MessageItem key={i} message={msg} />
      ))}
      {isLoading && <Typography variant="body2" color="textSecondary">Thinking...</Typography>}
      <div ref={messagesEndRef} /> {/* ✅ this helps scroll to bottom */}
    </Box>
  );

export default MessageList;
