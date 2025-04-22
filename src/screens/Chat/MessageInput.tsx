import { Box, TextField, Button } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

interface Props {
    inputValue: string;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
    setInputValue: (value: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
  }

const MessageInput = ({ inputValue, setInputValue, isLoading, handleSubmit }: Props) => (
  <Box component="form" onSubmit={handleSubmit} p={2} display="flex" gap={2} borderTop="1px solid #ddd">
    <TextField
      fullWidth
      variant="outlined"
      placeholder="Ask something..."
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      disabled={isLoading}
    />
    <Button type="submit" variant="contained" disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send'}
    </Button>
  </Box>
);

export default MessageInput;
