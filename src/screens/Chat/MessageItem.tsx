import { Box, Typography, Paper } from '@mui/material';
import { ChatMessage } from './types/types'; 

interface Props {
  message: ChatMessage;
}

const MessageItem = ({ message }: Props) => {
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';

  const bgColor = isUser ? 'primary.main' : isModel ? 'grey.200' : 'grey.100';
  const color = isUser ? '#fff' : 'inherit';
  const align = isUser ? 'flex-end' : isModel ? 'flex-start' : 'center';

  return (
    <Box display="flex" justifyContent={align}>
      <Paper
        sx={{
          p: 1.5,
          maxWidth: '75%',
          bgcolor: bgColor,
          color,
          borderRadius: 3,
        }}
      >
        <Typography variant="body2" fontWeight="bold">
          {message.role === 'model' ? 'Assistant' : message.role === 'user' ? 'You' : message.role}
        </Typography>
        {message.parts.map((p, idx) => (
          <Typography key={idx} variant="body1">{p.text}</Typography>
        ))}
      </Paper>
    </Box>
  );
};

export default MessageItem;
