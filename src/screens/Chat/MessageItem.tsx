import { Box, Typography, Paper, Link } from '@mui/material';
import { ChatMessage } from './types/types';
import ReactMarkdown from 'react-markdown'; // Import the library
import rehypeHighlight from 'rehype-highlight'; // Import highlighter plugin
import 'highlight.js/styles/github.css'; // Import a highlight.js theme (choose one you like)
                                        // You might want to import this globally (e.g., in index.tsx or App.tsx)

interface Props {
  message: ChatMessage;
}

// Define MUI component mappings for Markdown elements
const markdownComponents = {
  // Map paragraphs to MUI Typography
  p: ({node, ...props}: any) => <Typography variant="body1" paragraph {...props} />,

  // Map headings (adjust variants as needed)
  h1: ({node, ...props}: any) => <Typography variant="h4" gutterBottom {...props} />,
  h2: ({node, ...props}: any) => <Typography variant="h5" gutterBottom {...props} />,
  h3: ({node, ...props}: any) => <Typography variant="h6" gutterBottom {...props} />,
  h4: ({node, ...props}: any) => <Typography variant="subtitle1" gutterBottom {...props} />,
  h5: ({node, ...props}: any) => <Typography variant="subtitle2" gutterBottom {...props} />,
  h6: ({node, ...props}: any) => <Typography variant="caption" gutterBottom {...props} />,

  // Map lists
  ul: ({node, ...props}: any) => <Box component="ul" sx={{ pl: 2, mt: 1, mb: 1 }} {...props} />,
  ol: ({node, ...props}: any) => <Box component="ol" sx={{ pl: 2, mt: 1, mb: 1 }} {...props} />,
  li: ({node, ...props}: any) => <Typography component="li" variant="body1" {...props} />,

  // Map links to MUI Link
  a: ({node, ...props}: any) => <Link target="_blank" rel="noopener noreferrer" {...props} />,

  // Map code blocks (styling handled by rehype-highlight and the imported CSS)
  // You can further customize pre/code styling here if needed
  pre: ({node, ...props}: any) => <Box component="pre" sx={{ overflowX: 'auto', p: 1, bgcolor: 'grey.100', borderRadius: 1 }} {...props} />,
  code: ({node, inline, ...props}: any) => (
    <Typography
      component="code"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.9em',
        bgcolor: inline ? 'action.hover' : 'transparent', // Different background for inline code
        p: inline ? '0.2em 0.4em' : 0,
        borderRadius: inline ? '3px' : 0,
      }}
      {...props}
     />
   ),

   // Map blockquotes
   blockquote: ({node, ...props}: any) => (
     <Paper
       elevation={0}
       sx={{
         borderLeft: (theme) => `4px solid ${theme.palette.divider}`,
         pl: 1.5,
         my: 1,
         fontStyle: 'italic',
         color: 'text.secondary',
       }}
       {...props}
     />
   ),

   // Map thematic breaks (horizontal rules)
   hr: ({node, ...props}: any) => <Box component="hr" sx={{ my: 2, border: 'none', borderTop: (theme) => `1px solid ${theme.palette.divider}` }} {...props} />,

   // You can add mappings for other elements like tables (<table>, <thead>, etc.) if needed
};


const MessageItem = ({ message }: Props) => {
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';

  const bgColor = isUser ? 'primary.main' : isModel ? 'grey.200' : 'grey.100';
  const color = isUser ? '#fff' : 'inherit';
  const align = isUser ? 'flex-end' : isModel ? 'flex-start' : 'center';

  // Combine parts into a single string for Markdown rendering
  // Assumes the backend sends the complete Markdown message potentially split into parts.
  // Adjust if each part is meant to be a *separate* markdown block.
  const messageText = message.parts.map(p => p.text).join('');

  return (
    <Box display="flex" justifyContent={align} sx={{ mb: 1 }}> {/* Add some margin between messages */}
      <Paper
        elevation={1} // Add slight elevation
        sx={{
          p: 1.5,
          maxWidth: '75%',
          bgcolor: bgColor,
          color,
          borderRadius: 3,
          overflow: 'hidden', // Ensure content like code blocks don't break layout
        }}
      >
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}> {/* Margin below role */}
          {message.role === 'model' ? 'Assistant' : message.role === 'user' ? 'You' : message.role}
        </Typography>

        {/* Use ReactMarkdown to render the combined text */}
        <ReactMarkdown
          components={markdownComponents} // Use our MUI component mapping
          rehypePlugins={[rehypeHighlight]} // Enable syntax highlighting
        >
          {messageText}
        </ReactMarkdown>
      </Paper>
    </Box>
  );
};

export default MessageItem;