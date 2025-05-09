import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip, // Import Chip
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PublicIcon from "@mui/icons-material/Public";
import CheckIcon from "@mui/icons-material/Check"; // For a clearer "active" state on the chip
import { useState } from "react";
import { toast } from "react-toastify";
import { get } from "../../utils/api_helper/api_helper";

interface Props {
  inputValue: string;
  handleSubmit: (
    e?: React.FormEvent<HTMLFormElement>,
    searchWeb?: boolean
  ) => void | Promise<void>;
  setInputValue: (value: string) => void;
  isLoading?: boolean;
}

const MessageInput = ({
  inputValue,
  setInputValue,
  isLoading,
  handleSubmit,
}: Props) => {
  const [isSearchWebActive, setIsSearchWebActive] = useState(false);

  const handleToggleSearchWeb = () => {
    setIsSearchWebActive((prev) => !prev);
  };

  const checkIfBraveIsConfigfured = async () => {
    try {
      const settings = await get("/api/services/get"); // <- Properly parse the response to JSON

      if (settings && settings.leftList) {
        const braveSearch = settings.leftList.find(
          (item: any) => item?.key === "brave-search"
        );
        if (!braveSearch || !braveSearch?.config?.env?.BRAVE_API_KEY) {
          toast.info(
            "Brave Search MCP is required for this operation and is not configured in your settings."
          );
          return null;
        }
        handleToggleSearchWeb();
      }
    } catch (e) {
      console.log(e);
      toast.info(
        "Brave Search MCP is required for this operation and is not configured in your settings."
      );
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !isLoading &&
      inputValue.trim()
    ) {
      event.preventDefault();
      handleSubmit(undefined, isSearchWebActive);
    }
  };

  const handleActualSubmit = () => {
    if (!isLoading && inputValue.trim()) {
      handleSubmit(undefined, isSearchWebActive);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Input Area: TextField and Send Button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "28px", // Keep the pill shape for the input itself
          backgroundColor: "background.paper",
          minHeight: "48px", // Maintain a consistent height
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          size="small"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          multiline
          maxRows={5}
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            flexGrow: 1,
            alignSelf: "stretch",
            "& .MuiInputBase-root": {
              height: "100%",
              padding: "4px 8px", // Give a little internal horizontal padding
              display: "flex",
              alignItems: "center",
            },
            "& .MuiInputBase-input": {
              fontSize: "0.95rem",
              py: "2.5px",
            },
          }}
        />
        <Tooltip title={isLoading ? "Sending..." : "Send Message"}>
          <span>
            <IconButton
              color="primary"
              onClick={handleActualSubmit}
              disabled={isLoading || !inputValue.trim()}
              size="medium"
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {/* Search Web Toggle - Placed Above Input */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", px: 1 }}>
        <Tooltip
          title={
            isSearchWebActive
              ? "Web search is ON"
              : "Search the web with your message"
          }
        >
          <Chip
            icon={
              isSearchWebActive ? (
                <CheckIcon fontSize="small" />
              ) : (
                <PublicIcon fontSize="small" />
              )
            }
            label="Search Web"
            clickable
            onClick={async () => {
              await checkIfBraveIsConfigfured();
            }}
            disabled={isLoading}
            size="small"
            variant={isSearchWebActive ? "filled" : "outlined"}
            color={isSearchWebActive ? "primary" : "default"}
            sx={{
              // Common styles
              borderRadius: "16px", // Standard chip border radius
              fontWeight: 500,
              // Styles for INACTIVE state (outlined, default color)
              ...(!isSearchWebActive && {
                borderColor: "grey.400", // Softer border for inactive
                color: "text.secondary",
                "& .MuiChip-icon": {
                  color: "text.secondary",
                },
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "grey.500",
                },
              }),
              // Styles for ACTIVE state (filled, primary color)
              ...(isSearchWebActive && {
                // color: 'primary.contrastText', // Handled by variant="filled" color="primary"
                // backgroundColor: 'primary.main', // Handled by variant="filled" color="primary"
                "& .MuiChip-icon": {
                  // color: 'primary.contrastText', // Handled by variant="filled" color="primary"
                },
                "&:hover": {
                  // backgroundColor: 'primary.dark', // Default hover for primary.main
                },
              }),
            }}
          />
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MessageInput;
