import { Box, TextField, IconButton, CircularProgress, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface Props {
    inputValue: string;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void | Promise<void>; // Make event optional
    setInputValue: (value: string) => void;
    isLoading?: boolean;
  }

const MessageInput = ({ inputValue, setInputValue, isLoading, handleSubmit }: Props) => {
  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading && inputValue.trim()) {
      event.preventDefault(); // Prevent newline in TextField
      handleSubmit();
    }
  };

  return (
    // Use Box instead of form directly if needed, handle submit via button/enter key
    <Box
      // component="form" // Keep if you prefer form semantics
      // onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1, // Padding inside the input area box
        // backgroundColor: 'background.paper', // Set in parent Box now
        // borderRadius: '25px', // Round the whole input container
        // border: 1,
        // borderColor: 'divider',
      }}
    >
      <TextField
        fullWidth
        variant="outlined" // Or "filled" if preferred with the theme
        size="small" // Make input slightly smaller vertically
        placeholder="Type your message..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress} // Handle Enter key
        disabled={isLoading}
        multiline // Allow multi-line input
        maxRows={4} // Limit height expansion
        sx={{
          flexGrow: 1,
          '& .MuiOutlinedInput-root': {
             borderRadius: '20px', // Rounded input field itself
             // Disable default outline focus ring if desired, handle focus via border color
             // '&.Mui-focused fieldset': {
             //   borderWidth: '1px',
             // },
          },
        }}
      />
      <Tooltip title={isLoading ? "Sending..." : "Send Message"}>
        {/* Wrap IconButton in span for Tooltip when disabled */}
        <span>
           <IconButton
            color="primary"
            onClick={() => handleSubmit()} // Call submit handler directly
            disabled={isLoading || !inputValue.trim()}
            size="medium" // Adjust size if needed
            sx={{
                 // bgcolor: 'primary.main', // Use background color
                 // color: 'primary.contrastText',
                 // '&:hover': {
                 //      bgcolor: 'primary.dark',
                 // }
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
          </IconButton>
        </span>

      </Tooltip>
    </Box>
  );
};

export default MessageInput;