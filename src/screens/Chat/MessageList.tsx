import { ChatMessage } from './types/types'; // Adjust path
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator'; // Import the new component
import { Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>; // Keep ref for potential scroll target
}

const MessageList = ({ messages, isLoading }: Props) => (
    // Add some margin bottom to push the list up from the input field slightly
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2, flexGrow: 1 }}>
      {/* AnimatePresence handles enter/exit animations */}
      <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageItem key={i} message={msg} />
          ))}
      </AnimatePresence>

      {/* Show typing indicator when loading */}
      {isLoading && <TypingIndicator />}

      {/* The ref can still be useful, though scrolling the parent container is primary */}
      {/* <div ref={messagesEndRef} style={{ height: '1px' }}/> */}
    </Box>
  );

export default MessageList;