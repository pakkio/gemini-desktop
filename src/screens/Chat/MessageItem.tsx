import { Box, Typography, Paper, Link, Avatar, useTheme } from '@mui/material';
import { ChatMessage } from './types/types'; // Adjust path
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css'; // Choose a theme (atom-one-dark is nice)
import { motion } from 'framer-motion'; // Import motion
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Or your preferred bot icon

interface Props {
  message: ChatMessage;
}

// Keep your markdownComponents definition (it's good!)
const markdownComponents = {
  p: ({node, ...props}: any) => <Typography variant="body2" paragraph sx={{ mb: 1, '&:last-child': { mb: 0 } }} {...props} />, // Use body2 for tighter text, adjust margins
  h1: ({node, ...props}: any) => <Typography variant="h5" gutterBottom {...props} />,
  h2: ({node, ...props}: any) => <Typography variant="h6" gutterBottom {...props} />,
  h3: ({node, ...props}: any) => <Typography variant="subtitle1" gutterBottom {...props} />,
  // Add other headings if needed
  ul: ({node, ...props}: any) => <Box component="ul" sx={{ pl: 2.5, my: 0.5 }} {...props} />,
  ol: ({node, ...props}: any) => <Box component="ol" sx={{ pl: 2.5, my: 0.5 }} {...props} />,
  li: ({node, ...props}: any) => <Typography component="li" variant="body2" sx={{ my: 0.5 }} {...props} />,
  a: ({node, ...props}: any) => <Link target="_blank" rel="noopener noreferrer" {...props} />,
  pre: ({node, ...props}: any) => <Box component="pre" sx={{ overflowX: 'auto', p: 1.5, my: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, fontSize: '0.85rem' }} {...props} />,
  code: ({node, inline, className, children, ...props}: any) => {
    return !inline ? ( // Block code (handled by pre and rehypeHighlight)
       <code className={className} {...props}>{children}</code>
    ) : ( // Inline code
      <Typography
        component="code"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.9em',
          bgcolor: 'action.hover',
          p: '0.1em 0.3em',
          borderRadius: '4px',
        }}
        {...props}
      >{children}</Typography>
    )
  },
   blockquote: ({node, ...props}: any) => (
     <Box
       component="blockquote"
       sx={{
         borderLeft: (theme) => `4px solid ${theme.palette.divider}`,
         pl: 1.5,
         my: 1,
         fontStyle: 'italic',
         color: 'text.secondary',
         '& p': { // Ensure paragraphs inside blockquotes have less margin
            m: 0,
         }
       }}
       {...props}
     />
   ),
   hr: ({node, ...props}: any) => <Box component="hr" sx={{ my: 2, border: 'none', borderTop: (theme) => `1px solid ${theme.palette.divider}` }} {...props} />,
};

const MessageItem = ({ message }: Props) => {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';
  const isSystem = message.role === 'system';

  const justify = isUser ? 'flex-end' : 'flex-start'; // Needed for outer container alignment

  const bubbleColor = isUser
    ? theme.palette.userBubble.main // Use theme custom color
    : isModel
    ? theme.palette.modelBubble.main // Use theme custom color
    : theme.palette.grey[400]; // System message color

  const textColor = isUser
    ? theme.palette.userBubble.contrastText
    : isModel
    ? theme.palette.modelBubble.contrastText
    : theme.palette.getContrastText(theme.palette.grey[400]);

  const borderRadius = isUser
    ? '20px 20px 5px 20px'
    : '20px 20px 20px 5px';

  const messageText = message.parts.map(p => p.text).join('\n'); // Join with newline for potential markdown structure

  // Animation variants for framer-motion
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (isSystem) {
      return (
          <motion.div initial="hidden" animate="visible" variants={variants} style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: theme.spacing(1), marginBottom: theme.spacing(1) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', maxWidth: '80%' }}>
                {messageText}
            </Typography>
          </motion.div>
      )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      style={{ display: 'flex', justifyContent: justify, width: '100%' }} // Align the whole row
      layout // Animate layout changes smoothly if content size changes
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, maxWidth: '80%' }}>
        {/* Avatar for Model */}
        {isModel && (
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', mb: 0.5 }}>
            <SmartToyIcon fontSize="small" />
          </Avatar>
        )}

        <Paper
          elevation={1}
          sx={{
            width:"100%",
            p: '10px 14px', // Adjust padding
            bgcolor: bubbleColor,
            color: textColor,
            borderRadius: borderRadius,
            overflowWrap: 'break-word', // Break long words/urls
            wordBreak: 'break-word', // Ensure breaks
            hyphens: 'auto',
            // Remove default paragraph margin from markdown renderer if it's the only element
             '& .MuiTypography-paragraph:last-child': {
                mb: 0,
             },
          }}
        >
          {/* Render Role only if needed, maybe just for system or debug */}
          {/* <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 'medium', opacity: 0.8 }}>
            {isModel ? 'Assistant' : 'You'}
          </Typography> */}

          <ReactMarkdown
            components={markdownComponents}
            rehypePlugins={[rehypeHighlight]}
            // remarkPlugins={[remarkGfm]} // Optional: Add Github Flavored Markdown support
          >
            {messageText}
          </ReactMarkdown>
        </Paper>

        {/* Avatar for User (Optional, uncomment if desired) */}
        {/* {isUser && (
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', mb: 0.5 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
        )} */}
      </Box>
    </motion.div>
  );
};

export default MessageItem;