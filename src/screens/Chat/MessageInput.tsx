import { Box, TextField, IconButton, CircularProgress, Tooltip, MenuItem, Button, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState } from 'react';

interface Props {
    inputValue: string;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void | Promise<void>; // Make event optional
    setInputValue: (value: string) => void;
    isLoading?: boolean;
  }

const MessageInput = ({ inputValue, setInputValue, isLoading, handleSubmit }: Props) => {
  const [selectedModel, setSelectedModel] = useState('Model 1'); // Default model
  const [isModelListOpen, setIsModelListOpen] = useState(false); // Track model list expansion

  // Models for selection
  const models = ['Model 1', 'Model 2', 'Model 3', 'Model 4'];

  // Open/close the model list
  const handleModelClick = () => {
    setIsModelListOpen(!isModelListOpen);
  };

  const handleModelClose = (model: string) => {
    setSelectedModel(model);
    setIsModelListOpen(false); 
  };

  // Handle Enter key press
  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading && inputValue.trim()) {
      event.preventDefault(); // Prevent newline in TextField
      handleSubmit();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Model Selection Button and Chat Area */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Model Selection */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={handleModelClick}
            sx={{
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px', 
            }}
          >
            {selectedModel}
            {isModelListOpen ? (
              <ExpandMoreIcon sx={{ ml: 1 }} />
            ) : (
              <ExpandLessIcon sx={{ ml: 1 }} />
            )}
          </Button>

          {/* If the model list is open, show available models */}
          {isModelListOpen && (
            <Paper sx={{ position: 'absolute', zIndex: 100, bottom: '55px', left: '25px', width: 'auto' }}>
              <Box sx={{ border: 1, borderRadius: '8px',borderColor: 'primary.main', boxShadow: 3, backgroundColor: 'background.paper' }}>
                {models.map((model) => (
                  <MenuItem key={model} onClick={() => handleModelClose(model)}>
                    {model}
                  </MenuItem>
                ))}
              </Box>
            </Paper>
          )}
        </Box>

        {/* Message Input Area */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
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
      </Box>
    </Box>
  );
};

export default MessageInput;