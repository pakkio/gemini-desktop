// MessageInput.tsx
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
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ClearIcon from "@mui/icons-material/Clear";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { get } from "../../utils/api_helper/api_helper";

declare global {
  interface Window {
    api: {
      getMicStatus: (status: string) => Promise<boolean>;
    };
  }
}

interface Props {
  onMessageSubmit: (
    text: string,
    files: File[],
    searchWeb?: boolean
  ) => Promise<void>;
  isLoading?: boolean; // For the main text submission loading state from parent
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 25;

// Using the ACCEPTED_FILE_TYPES_STRING from your last provided snippet
const ACCEPTED_FILE_TYPES_STRING = [
  "application/pdf",
  ".pdf", // Note: ".pdf" might not be standard for accept attr, MIME type is preferred
  // "application/msword", ".doc",
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".docx",
  "text/csv",
  ".csv",
  "text/plain",
  ".txt",
  "audio/*",
  "image/*",
  "video/*",
  "application/vnd.ms-excel",
  ".xls",
  ".xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // "application/vnd.ms-powerpoint",
  //  ".ppt",
  ".pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
].join(",");

const MessageInput = ({
  onMessageSubmit,
  isLoading: parentIsLoading,
}: Props) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSearchWebActive, setIsSearchWebActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isAudioUploading, setIsAudioUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSearchWeb = () => {
    setIsSearchWebActive((prev) => !prev);
  };

  useEffect(() => {
    if (window?.api?.getMicStatus) {
      window.api.getMicStatus("status").then((res) => setIsMicEnabled(res));
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
          toast.info("Brave Search MCP is not configured.");
          return null;
        }
        handleToggleSearchWeb();
      }
    } catch (e) {
      console.error("Error checking Brave config:", e);
      toast.error("Could not verify Brave Search configuration.");
    }
  };

  const mainInputAreaBusy =
    parentIsLoading || isAudioRecording || isAudioUploading;
  const canSubmitForm = () =>
    (inputValue.trim() !== "" || selectedFiles.length > 0) &&
    !mainInputAreaBusy;

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!canSubmitForm()) return;

    await onMessageSubmit(inputValue.trim(), selectedFiles, isSearchWebActive);
    setInputValue("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey && canSubmitForm()) {
      event.preventDefault();
      handleFormSubmit();
    }
  };

  const handleFileSelectClick = () => {
    if (mainInputAreaBusy) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      let addedFiles: File[] = [];
      const currentFileNames = selectedFiles.map((f) => f.name);

      newFiles.forEach((file) => {
        if (selectedFiles.length + addedFiles.length >= MAX_FILES) {
          toast.warn(`Maximum ${MAX_FILES} files allowed.`);
          return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.warn(
            `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`
          );
          return;
        }
        if (
          currentFileNames.includes(file.name) ||
          addedFiles.some((af) => af.name === file.name)
        ) {
          toast.info(`File "${file.name}" is already selected or in batch.`);
          return;
        }
        addedFiles.push(file);
      });

      if (addedFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...addedFiles]);
        toast.success(`${addedFiles.length} file(s) added.`);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
    toast.info(`File "${fileName}" removed.`);
  };

  const handleStartRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("MediaDevices API not supported.");
      return;
    }
    if (selectedFiles.length > 0) {
      toast.warn("Clear selected files before starting voice input.");
      return;
    }
    if (isAudioRecording || isAudioUploading) return; // Already recording or uploading

    audioChunksRef.current = [];
    setInputValue("");
    setIsAudioRecording(true); // Set state before async operations

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // isAudioRecording is set to false in handleStopRecording or error handler
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (audioBlob.size === 0) {
          toast.warn("No audio recorded.");
          setIsAudioUploading(false); // Ensure this is reset
          return;
        }

        setIsAudioUploading(true);
        const formData = new FormData();
        formData.append("audioFile", audioBlob, "recording.webm");

        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/chat/text`,
            {
              method: "POST",
              body: formData,
            }
          );
          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => `HTTP error ${response.status}`);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
          }
          const result = await response.json();
          if (result.transcript) {
            setInputValue(result.transcript);
            toast.success("Voice input transcribed!");
          } else {
            toast.warn("Transcription not found.");
          }
        } catch (apiError: any) {
          toast.error(`Failed to process audio: ${apiError.message}`);
        } finally {
          setIsAudioUploading(false);
        }
      };
      mediaRecorderRef.current.onerror = (event: any) => {
        toast.error(
          `Recording error: ${event.error?.message || "Unknown error"}`
        );
        setIsAudioRecording(false);
        setIsAudioUploading(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current.start();
      toast.success("Recording started!");
    } catch (err: any) {
      toast.error(`Could not start recording: ${err.message}`);
      setIsAudioRecording(false); // Reset on error
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [selectedFiles.length, isAudioRecording, isAudioUploading]);

  const handleStopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop(); // onstop will handle stream cleanup and more
    }
    setIsAudioRecording(false); // Set immediately for UI feedback
    // If stream wasn't cleaned up by onstop (e.g., error before onstop), try cleanup here
    if (streamRef.current && mediaRecorderRef.current?.state !== "inactive") {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.log("Fallback stream cleanup in handleStopRecording");
    }
  }, []);

  const micButtonDisabled = isAudioRecording
    ? isAudioUploading // When recording (Stop button): disable only if processing previous audio
    : !isMicEnabled ||
      parentIsLoading ||
      isAudioUploading ||
      selectedFiles.length > 0;

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      {selectedFiles.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            p: 1,
            mb: 0.5,
            maxHeight: "100px",
            overflowY: "auto",
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: "12px",
          }}
        >
          {selectedFiles.map((file) => (
            <Tooltip
              key={file.name}
              title={`${file.name} (${(file.size / 1024 / 1024).toFixed(
                2
              )} MB)`}
            >
              <Chip
                label={
                  file.name.length > 20
                    ? `${file.name.substring(0, 17)}...`
                    : file.name
                }
                size="small"
                onDelete={
                  mainInputAreaBusy
                    ? undefined
                    : () => handleRemoveFile(file.name)
                }
                deleteIcon={
                  mainInputAreaBusy ? <span /> : <ClearIcon fontSize="small" />
                }
                disabled={mainInputAreaBusy}
                variant="outlined"
              />
            </Tooltip>
          ))}
        </Box>
      )}

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
        <Tooltip title="Attach Files">
          <span>
            <IconButton
              color="primary"
              onClick={handleFileSelectClick}
              disabled={mainInputAreaBusy || selectedFiles.length >= MAX_FILES}
              size="medium"
            >
              <AttachFileIcon />
            </IconButton>
          </span>
        </Tooltip>
        <input
          type="file"
          multiple // Allows selecting multiple files
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept={ACCEPTED_FILE_TYPES_STRING}
          disabled={mainInputAreaBusy}
        />

        <Tooltip
          title={isAudioRecording ? "Stop Recording" : "Start Voice Input"}
        >
          <span>
            <IconButton
              color={isAudioRecording ? "error" : "primary"}
              onClick={
                isAudioRecording ? handleStopRecording : handleStartRecording
              }
              disabled={micButtonDisabled}
              size="medium"
            >
              {isAudioUploading ? ( // If actively uploading, always show spinner
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
            isAudioRecording
              ? "Recording... speak now"
              : selectedFiles.length > 0
              ? "Add a message for your files..."
              : "Type your message..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={mainInputAreaBusy}
          multiline
          maxRows={5}
          InputProps={{ disableUnderline: true }}
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
              lineHeight: 1.4,
            },
          }}
        />
        <Tooltip title={parentIsLoading ? "Sending..." : "Send Message"}>
          <span>
            <IconButton
              type="submit"
              color="primary"
              disabled={!canSubmitForm()}
              size="medium"
            >
              {parentIsLoading && !isAudioUploading ? (
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
          title={isSearchWebActive ? "Web search is ON" : "Search the web"}
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
              if (mainInputAreaBusy) return;
              await checkIfBraveIsConfigfured();
            }}
            disabled={mainInputAreaBusy}
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
    </Box>
  );
};

export default MessageInput;
