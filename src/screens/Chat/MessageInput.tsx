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
import VideocamIcon from "@mui/icons-material/Videocam"; // New Icon for Screen Recording

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { get } from "../../utils/api_helper/api_helper";

declare global {
  interface Window {
    api: {
      getMicStatus: (status: string) => Promise<boolean>;
    };
  }
  // For getDisplayMedia, even if included by default in modern TS, explicit can be good.
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  }
}

interface Props {
  onMessageSubmit: (
    text: string,
    files: File[],
    searchWeb?: boolean
  ) => Promise<void>;
  isLoading?: boolean;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 25;

const ACCEPTED_FILE_TYPES_STRING = [
  "application/pdf",
  ".pdf",
  ".docx",
  "text/csv",
  ".csv",
  "text/plain",
  ".txt",
  "audio/*",
  "image/*",
  "video/*", // Covers .webm from screen recording
  "application/vnd.ms-excel",
  ".xls",
  ".xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

  // Voice Recording States
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);

  // Screen Recording States
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const screenMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenRecordedChunksRef = useRef<Blob[]>([]);
  const originalScreenDisplayStreamRef = useRef<MediaStream | null>(null); // Stream from getDisplayMedia
  const micStreamForScreenRecordRef = useRef<MediaStream | null>(null); // Mic stream used during screen recording
  const audioContextForScreenRecordRef = useRef<AudioContext | null>(null); // AudioContext for merging audio

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window?.api?.getMicStatus) {
      window.api.getMicStatus("status").then((res) => setIsMicEnabled(res));
    }
  }, []);

  const handleToggleSearchWeb = () => {
    setIsSearchWebActive((prev) => !prev);
  };

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
    parentIsLoading ||
    isVoiceRecording ||
    isVoiceProcessing ||
    isScreenRecording;

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
    if (isSearchWebActive) {
      // Optionally reset search web toggle after submit
      setIsSearchWebActive(false);
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

  // Helper function to add a single programmatically generated file (e.g., screen recording)
  const addSingleFileToSelection = (file: File): boolean => {
    if (selectedFiles.length >= MAX_FILES) {
      toast.warn(
        `Maximum ${MAX_FILES} files allowed. "${file.name}" not added.`
      );
      return false;
    }
    // if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    //   toast.warn(
    //     `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`
    //   );
    //   return false;
    // }
    if (selectedFiles.some((f) => f.name === file.name)) {
      toast.info(`File "${file.name}" is already selected.`); // Should be rare for timestamped recordings
      return false;
    }

    setSelectedFiles((prev) => [...prev, file]);
    toast.success(`"${file.name}" added as an attachment.`);
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mainInputAreaBusy) return;
    if (event.target.files) {
      const newFilesArray = Array.from(event.target.files);
      const filesToAdd: File[] = [];

      const initialSelectedCount = selectedFiles.length;
      const availableSlots = MAX_FILES - initialSelectedCount;
      let filesSkippedCount = 0;

      newFilesArray.forEach((file) => {
        if (filesToAdd.length >= availableSlots) {
          filesSkippedCount++;
          return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.warn(
            `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit and was not added.`
          );
          filesSkippedCount++;
          return;
        }
        if (
          selectedFiles.some((f) => f.name === file.name) ||
          filesToAdd.some((af) => af.name === file.name)
        ) {
          toast.info(
            `File "${file.name}" is already selected or in the current batch and was skipped.`
          );
          filesSkippedCount++;
          return;
        }
        filesToAdd.push(file);
      });

      if (filesToAdd.length > 0) {
        setSelectedFiles((prev) => [...prev, ...filesToAdd]);
        toast.success(`${filesToAdd.length} file(s) added.`);
      }

      if (filesSkippedCount > 0 && filesToAdd.length < newFilesArray.length) {
        toast.warn(
          `${filesSkippedCount} file(s) from your selection were not added due to limits or duplication.`
        );
      } else if (
        availableSlots === 0 &&
        newFilesArray.length > 0 &&
        filesToAdd.length === 0
      ) {
        toast.warn(
          `Maximum ${MAX_FILES} files already selected. No new files were added.`
        );
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

  // --- Voice Recording Logic ---
  const handleStartVoiceRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("MediaDevices API not supported for voice recording.");
      return;
    }
    if (selectedFiles.length > 0) {
      toast.warn("Clear selected files before starting voice input.");
      return;
    }
    if (isVoiceRecording || isVoiceProcessing || isScreenRecording) {
      toast.warn("Another recording or processing is already in progress.");
      return;
    }

    voiceAudioChunksRef.current = [];
    setInputValue("");
    setIsVoiceRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceMediaRecorderRef.current = new MediaRecorder(stream);

      voiceMediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) voiceAudioChunksRef.current.push(event.data);
      };

      voiceMediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(voiceAudioChunksRef.current, {
          type: "audio/webm",
        });
        voiceAudioChunksRef.current = [];
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;

        if (audioBlob.size === 0) {
          toast.warn("No audio recorded for voice input.");
          setIsVoiceProcessing(false);
          return;
        }

        setIsVoiceProcessing(true);
        const formData = new FormData();
        formData.append("audioFile", audioBlob, "voice_recording.webm");

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
            toast.warn("Transcription not found for voice input.");
          }
        } catch (apiError: any) {
          toast.error(`Failed to process voice input: ${apiError.message}`);
        } finally {
          setIsVoiceProcessing(false);
        }
      };
      voiceMediaRecorderRef.current.onerror = (event: any) => {
        toast.error(
          `Voice recording error: ${event.error?.message || "Unknown error"}`
        );
        setIsVoiceRecording(false);
        setIsVoiceProcessing(false);
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
      };

      voiceMediaRecorderRef.current.start();
      toast.success("Voice recording started!");
    } catch (err: any) {
      toast.error(`Could not start voice recording: ${err.message}`);
      setIsVoiceRecording(false);
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
    }
  }, [
    selectedFiles.length,
    isVoiceRecording,
    isVoiceProcessing,
    isScreenRecording,
  ]);

  const handleStopVoiceRecording = useCallback(() => {
    if (
      voiceMediaRecorderRef.current &&
      voiceMediaRecorderRef.current.state === "recording"
    ) {
      voiceMediaRecorderRef.current.stop();
    }
    setIsVoiceRecording(false);
    if (
      voiceStreamRef.current &&
      voiceMediaRecorderRef.current?.state !== "inactive"
    ) {
      voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
    }
  }, []);

  // --- Screen Recording Logic ---
  const cleanupScreenRecordingResources = useCallback(() => {
    originalScreenDisplayStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());
    micStreamForScreenRecordRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    if (
      audioContextForScreenRecordRef.current &&
      audioContextForScreenRecordRef.current.state !== "closed"
    ) {
      audioContextForScreenRecordRef.current
        .close()
        .catch((e) => console.warn("Error closing AudioContext:", e));
    }

    originalScreenDisplayStreamRef.current = null;
    micStreamForScreenRecordRef.current = null;
    audioContextForScreenRecordRef.current = null;
    screenMediaRecorderRef.current = null;
    screenRecordedChunksRef.current = [];
  }, []);

  const handleStartScreenRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error("Screen recording (getDisplayMedia API) is not supported.");
      return;
    }
    if (isVoiceRecording || isVoiceProcessing || isScreenRecording) {
      toast.warn("Another recording or processing is already in progress.");
      return;
    }
    if (selectedFiles.length >= MAX_FILES) {
      toast.warn(
        `Cannot start screen recording, maximum ${MAX_FILES} files already selected.`
      );
      return;
    }

    setIsScreenRecording(true);
    screenRecordedChunksRef.current = [];

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true, // Request screen audio (if available and user permits)
      });
      originalScreenDisplayStreamRef.current = displayStream;

      const tracksToRecord: MediaStreamTrack[] = [
        ...displayStream.getVideoTracks(),
      ];

      const audioContext = new AudioContext();
      audioContextForScreenRecordRef.current = audioContext;
      const mixedAudioDestination = audioContext.createMediaStreamDestination();

      let hasScreenAudio = false;
      if (displayStream.getAudioTracks().length > 0) {
        const screenAudioSource =
          audioContext.createMediaStreamSource(displayStream);
        screenAudioSource.connect(mixedAudioDestination);
        hasScreenAudio = true;
      }

      let hasMicAudio = false;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        micStreamForScreenRecordRef.current = micStream;
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(mixedAudioDestination);
        hasMicAudio = true;
      } catch (micError) {
        toast.warn(
          "Microphone not available or permission denied. Screen recording will continue without microphone audio."
        );
        console.error("Mic error for screen recording:", micError);
      }

      if (hasScreenAudio || hasMicAudio) {
        tracksToRecord.push(...mixedAudioDestination.stream.getAudioTracks());
      } else {
        toast.info(
          "Recording screen without any audio (no screen audio, no microphone)."
        );
      }

      const combinedStream = new MediaStream(tracksToRecord);
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });
      screenMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0)
          screenRecordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(screenRecordedChunksRef.current, {
          type: "video/webm",
        });
        const fileName = `screen-recording-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: "video/webm" });

        if (blob.size === 0) {
          toast.warn("Screen recording resulted in an empty file.");
        } else {
          addSingleFileToSelection(file); // Add the recorded file
        }
        cleanupScreenRecordingResources();
        setIsScreenRecording(false); // Set after all processing
      };

      mediaRecorder.onerror = (event: Event) => {
        const error = (event as any).error as DOMException;
        toast.error(
          `Screen recording error: ${error?.message || "Unknown error"}`
        );
        cleanupScreenRecordingResources();
        setIsScreenRecording(false);
      };

      // Handle if user stops sharing via browser UI
      displayStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          toast.info("Screen sharing stopped by user.");
          if (
            screenMediaRecorderRef.current &&
            screenMediaRecorderRef.current.state === "recording"
          ) {
            screenMediaRecorderRef.current.stop(); // Triggers onstop
          } else {
            cleanupScreenRecordingResources(); // Ensure cleanup if already stopped
            setIsScreenRecording(false);
          }
        };
      });

      mediaRecorder.start();
      toast.success("Screen recording started!");
    } catch (err: any) {
      toast.error(`Could not start screen recording: ${err.message}`);
      cleanupScreenRecordingResources();
      setIsScreenRecording(false);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        toast.error("Screen sharing permission denied by user.");
      }
    }
  }, [
    isVoiceRecording,
    isVoiceProcessing,
    isScreenRecording,
    selectedFiles.length,
    cleanupScreenRecordingResources,
  ]);

  const handleStopScreenRecording = useCallback(() => {
    if (
      screenMediaRecorderRef.current &&
      screenMediaRecorderRef.current.state === "recording"
    ) {
      screenMediaRecorderRef.current.stop(); // onstop handler will do the cleanup and set isScreenRecording to false
    } else {
      // Fallback if stop is called when not actively recording but resources might exist
      cleanupScreenRecordingResources();
      setIsScreenRecording(false);
    }
  }, [cleanupScreenRecordingResources]);

  // --- Button Disabled States ---
  const voiceMicButtonDisabled = isVoiceRecording
    ? isVoiceProcessing // Disable stop if processing
    : !isMicEnabled ||
      parentIsLoading ||
      isVoiceProcessing ||
      isScreenRecording ||
      selectedFiles.length > 0;

  const screenRecordButtonDisabled = isScreenRecording
    ? false // Stop button always enabled if recording
    : parentIsLoading ||
      isVoiceRecording ||
      isVoiceProcessing ||
      selectedFiles.length >= MAX_FILES;

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
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept={ACCEPTED_FILE_TYPES_STRING}
          disabled={mainInputAreaBusy}
        />

        <Tooltip
          title={
            isScreenRecording
              ? "Stop Screen Recording"
              : "Start Screen Recording"
          }
        >
          <span>
            <IconButton
              color={isScreenRecording ? "error" : "primary"}
              onClick={
                isScreenRecording
                  ? handleStopScreenRecording
                  : handleStartScreenRecording
              }
              disabled={screenRecordButtonDisabled}
              size="medium"
            >
              {isScreenRecording ? <StopIcon /> : <VideocamIcon />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip
          title={
            isVoiceRecording
              ? "Stop Voice Input"
              : "Start Voice Input (clears files)"
          }
        >
          <span>
            <IconButton
              color={isVoiceRecording ? "error" : "primary"}
              onClick={
                isVoiceRecording
                  ? handleStopVoiceRecording
                  : handleStartVoiceRecording
              }
              disabled={voiceMicButtonDisabled}
              size="medium"
            >
              {isVoiceProcessing ? (
                <CircularProgress size={24} color="inherit" />
              ) : isVoiceRecording ? (
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
            isVoiceRecording
              ? "Recording voice... speak now"
              : isScreenRecording
              ? "Screen recording in progress..."
              : selectedFiles.length > 0
              ? "Add a message for your files..."
              : "Type your message..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={
            mainInputAreaBusy ||
            isVoiceRecording /* TextField specifically disabled during voice recording as it gets auto-filled */
          }
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
              {parentIsLoading && !isVoiceProcessing ? (
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
