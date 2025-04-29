import {Box,Drawer,List,ListItem,ListItemText,Typography,Button,Divider} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ChatMessage } from "./types/types";
import { format } from "date-fns";
  
export type ChatHistory = {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
};
  
interface Props {
    drawerOpen: boolean;
    toggleDrawer: () => void;
    chatHistories: ChatHistory[];
    loadChat: (id: string) => void;
    startNewChat: () => void;
}
  
  const drawerWidth = 260;

  // Function to group chat histories by date
  const groupChatsByDate = (chatHistories: ChatHistory[]) => {
    return chatHistories.reduce((groups, chat) => {
      // Fallback to a default date if createdAt is undefined or invalid
      const dateStr = chat.createdAt || new Date().toISOString(); // Fallback to current date if undefined
      const date = new Date(dateStr);
  
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error(`Invalid date: ${dateStr}`); // Log invalid date for debugging
        return groups; // Skip this chat if the date is invalid
      }
  
      const formattedDate = format(date, "yyyy-MM-dd"); // Format date to 'yyyy-MM-dd'
  
      if (!groups[formattedDate]) {
        groups[formattedDate] = [];
      }
      groups[formattedDate].push(chat);
  
      return groups;
    }, {} as Record<string, ChatHistory[]>);
  };
      
  
  
  export default function ChatHistorySidebar({drawerOpen,toggleDrawer,chatHistories,loadChat,startNewChat}: Props) {
    const groupedChats = groupChatsByDate(chatHistories);

    return (
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        variant="temporary"
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            padding: 2,
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Chat History
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={startNewChat}
          fullWidth
          sx={{ mb: 2 }}
        >
          New Chat
        </Button>
        <Divider />
        <List>
        {Object.keys(groupedChats).map((date) => (
          <Box key={date} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginTop: 2 }}>
              {format(new Date(date), "MMMM dd, yyyy")} {/* Format the date */}
            </Typography>
            <List>
              {groupedChats[date].map((chat) => (
                <ListItem button key={chat.id} onClick={() => loadChat(chat.id)}>
                  <ListItemText primary={chat.title} />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </List>
      </Drawer>
    );
  }
  