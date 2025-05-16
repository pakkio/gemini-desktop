import { ChatMessage } from './types/types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList = ({ messages, isLoading }: Props) => (
    // Original Box structure and sx from your initial code for MessageList
    <Box sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2, // Original gap
        mb: 2, // Original margin-bottom
        // flexGrow: 1, // REMOVED as per previous fix, parent handles growth
    }}>
      <AnimatePresence initial={false}>
          {messages.map((msg) => (
            // Use msg.id if available and unique (which it should be from ChatPage)
            <MessageItem key={msg.id} message={msg} />
          ))}
      </AnimatePresence>

      {isLoading && <TypingIndicator />}

      {/* The ref can still be useful for specific scroll/focus,
          but the parent container handles overall scrolling */}
      {/* <div ref={messagesEndRef} style={{ height: '1px' }}/> */}
    </Box>
  );

export default MessageList;