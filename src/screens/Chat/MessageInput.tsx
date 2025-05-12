import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PublicIcon from "@mui/icons-material/Public";
import CheckIcon from "@mui/icons-material/Check";
import MicIcon from "@mui/icons-material/Mic"; // Added
import StopIcon from "@mui/icons-material/Stop"; // Added
import { useState, useRef, useCallback, useEffect } from "react"; // Added useRef, useCallback
import { toast } from "react-toastify";
import { get } from "../../utils/api_helper/api_helper";
// You might want a helper for posting files, or use fetch directly
// import { postWithFile } from "../../utils/api_helper/api_helper";

declare global {
  interface Window {
    api: {
      getMicStatus: (status: string) => Promise<boolean>;
      // add other api methods here if needed
    };
  }
}
interface Props {
  inputValue: string;
  handleSubmit: (
    e?: React.FormEvent<HTMLFormElement>,
    searchWeb?: boolean
  ) => void | Promise<void>;
  setInputValue: (value: string) => void;
  isLoading?: boolean; // This is for the main text submission
}

const MessageInput = ({
  inputValue,
  setInputValue,
  isLoading,
  handleSubmit,
}: Props) => {
  const [isSearchWebActive, setIsSearchWebActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false); // For microphone status
  // --- Audio Recording State and Refs ---
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isAudioUploading, setIsAudioUploading] = useState(false); // For API call loading state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null); // To hold the stream for proper cleanup

  const handleToggleSearchWeb = () => {
    setIsSearchWebActive((prev) => !prev);
  };

  useEffect(() => {
    if (window?.api?.getMicStatus) {
      window.api.getMicStatus("status").then((res) => {
        if (res) {
          setIsMicEnabled(true);
        } else {
          setIsMicEnabled(false);
        }
      });
    }
  }, []);

  const checkIfBraveIsConfigfured = async () => {
    try {
      const settings = await get("/api/services/get");
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
      console.error("Error checking Brave config:", e);
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
      !isAudioRecording && // Don't submit text if recording
      inputValue.trim()
    ) {
      event.preventDefault();
      handleSubmit(undefined, isSearchWebActive);
    }
  };

  const handleActualSubmit = () => {
    if (!isLoading && !isAudioRecording && inputValue.trim()) {
      handleSubmit(undefined, isSearchWebActive);
    }
  };

  // --- Audio Recording Functions ---
  const handleStartRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("MediaDevices API not supported by this browser.");
      console.error("MediaDevices API not supported.");
      return;
    }

    // Clear previous audio if any
    audioChunksRef.current = [];
    setInputValue(""); // Optionally clear text input when starting voice

    try {
      toast.info("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Store stream for cleanup
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsAudioRecording(false); // Set recording to false visually
        toast.info("Recording stopped. Processing audio...");
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        }); // Or audio/ogg, audio/mp4
        audioChunksRef.current = []; // Clear chunks

        // Clean up stream tracks (IMPORTANT!)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          console.log("Microphone stream stopped.");
        }

        if (audioBlob.size === 0) {
          toast.warn("No audio recorded.");
          return;
        }

        // Send to API
        setIsAudioUploading(true);
        const formData = new FormData();
        // The field name 'audioFile' and filename 'recording.webm' should match API expectations
        formData.append("audioFile", audioBlob, "recording.webm");

        try {
          // Replace with your actual API endpoint and method
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/chat/text`,
            {
              // TODO: Replace with actual API endpoint
              method: "POST",
              body: formData,
              // Add headers if needed, e.g., Authorization
            }
          );

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
              `API Error: ${response.status} - ${
                errorData || response.statusText
              }`
            );
          }

          const result = await response.json(); // Assuming API returns JSON with a transcript
          if (result.transcript) {
            setInputValue(result.transcript);
            toast.success("Voice input transcribed!");
            // Optionally, automatically submit the transcribed text:
            // handleSubmit(undefined, isSearchWebActive);
          } else {
            toast.warn("Transcription not found in API response.");
          }
        } catch (apiError) {
          console.error("Error sending audio to API:", apiError);
          if (apiError instanceof Error) {
            toast.error(`Failed to process audio: ${apiError.message}`);
          } else {
            toast.error("An unknown error occurred while processing audio.");
          }
        } finally {
          setIsAudioUploading(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        let errorMessage = "Unknown MediaRecorder error";
        // @ts-ignore
        if (event.error && event.error.message) {
          // @ts-ignore
          errorMessage = event.error.message;
        }
        toast.error(`Recording error: ${errorMessage}`);
        setIsAudioRecording(false);
        // Clean up stream tracks on error too
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsAudioRecording(true);
      toast.success("Recording started!");
    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          toast.error(
            "Microphone permission denied. Please enable it in your browser settings."
          );
        } else if (err.name === "NotFoundError") {
          toast.error(
            "No microphone found. Please ensure a microphone is connected and enabled."
          );
        } else {
          toast.error(`Could not start recording: ${err.message}`);
        }
      } else {
        toast.error(
          "An unknown error occurred while trying to start recording."
        );
      }
      // Ensure stream is cleaned up if start fails after getUserMedia
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsAudioRecording(false); // Ensure state is reset
    }
  }, [setInputValue, handleSubmit, isSearchWebActive]); // Added dependencies

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isAudioRecording) {
      mediaRecorderRef.current.stop();
      // onstop handler will manage setIsAudioRecording(false) and other cleanup
    }
  }, [isAudioRecording]); // Added dependency

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "28px",
          backgroundColor: "background.paper",
          minHeight: "48px",
        }}
      >
        {/* Microphone Button */}
        <Tooltip
          title={isAudioRecording ? "Stop Recording" : "Start Voice Input"}
        >
          <span>
            {" "}
            {/* Tooltip needs a child that can accept a ref if disabled */}
            <IconButton
              color={isAudioRecording ? "error" : "primary"}
              onClick={
                isAudioRecording ? handleStopRecording : handleStartRecording
              }
              // Disable mic if text is submitting, or if audio is currently uploading
              disabled={!isMicEnabled || isLoading || isAudioUploading}
              size="medium"
            >
              {isAudioUploading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isAudioRecording ? (
                <StopIcon />
              ) : (
                <MicIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <TextField
          fullWidth
          variant="standard"
          size="small"
          placeholder={
            isAudioRecording ? "Recording... speak now" : "Type your message..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || isAudioRecording || isAudioUploading} // Disable input while recording or uploading audio
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
              padding: "4px 8px",
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
              disabled={
                isLoading ||
                isAudioRecording ||
                isAudioUploading ||
                !inputValue.trim()
              } // Also disable if recording/uploading
              size="medium"
            >
              {/* Show loading spinner if main text submission is loading, but not if audio is uploading */}
              {isLoading && !isAudioUploading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
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
              if (isAudioRecording || isAudioUploading) return; // Don't toggle if busy with audio
              await checkIfBraveIsConfigfured();
            }}
            disabled={isLoading || isAudioRecording || isAudioUploading} // Disable if any loading/recording
            size="small"
            variant={isSearchWebActive ? "filled" : "outlined"}
            color={isSearchWebActive ? "primary" : "default"}
            sx={{
              borderRadius: "16px",
              fontWeight: 500,
              ...(!isSearchWebActive && {
                borderColor: "grey.400",
                color: "text.secondary",
                "& .MuiChip-icon": { color: "text.secondary" },
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "grey.500",
                },
              }),
            }}
          />
        </Tooltip>
      </Box>
      {/* Optional: Display detailed audio status if needed */}
      {/* { (isAudioRecording || isAudioUploading) && <Typography variant="caption">Audio Status: ...</Typography> } */}
    </Box>
  );
};

export default MessageInput;
