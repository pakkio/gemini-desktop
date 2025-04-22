import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Paper,
  CircularProgress,
} from "@mui/material";
import { get, post } from "../../utils/api_helper/api_helper";
import { motion } from "framer-motion";
import SettingsIcon from "@mui/icons-material/Settings";
import CancelIcon from "@mui/icons-material/Cancel";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

const validateGeminiApiKey = async (apiKey: string) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.ok) {
        return { valid: true };
      } else {
        const error = await response.json();
        console.warn("❌ Invalid API Key:", error);
        return { valid: false, error };
      }
    } catch (err) {
      console.error("Validation error:", err);
      return { valid: false, error: err };
    }
  };
  

const ServerConfiguration: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [displayButtons, setDisplayButtons] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function checkServerConfig() {
    try {
      const serverConfig = await get("/api/server-config");
      if (serverConfig?.GEMINI_API_KEY) {
        setDisplayButtons(true);
      }
    } catch (e) {
      setDisplayButtons(false);
      console.log(e);
    }
  }

  useEffect(() => {
    checkServerConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);

    const validation = await validateGeminiApiKey(apiKey);
    if (!validation.valid) {
      alert("❌ Invalid Gemini API Key. Please check and try again.");
      setLoading(false);
      return;
    }

    try {
      await post("/api/server-config", { GEMINI_API_KEY: apiKey });
      navigate("/");
    } catch (error) {
      console.error("Failed to save API key:", error);
      alert("❌ Failed to save API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        p: 2,
      }}
    >
      <Paper elevation={4} sx={{ p: 4, width: 400, borderRadius: 4 }}>
        <Stack spacing={4} alignItems="center">
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            🚀 Server Configuration
          </Typography>

          <TextField
            fullWidth
            label="🔑 Gemini API Key"
            placeholder="Enter your Gemini API Key"
            value={apiKey}
            type="password"
            onChange={(e) => setApiKey(e.target.value)}
            variant="outlined"
          />

          <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleSave}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <RocketLaunchIcon />
                )
              }
              disabled={!apiKey || loading}
            >
              {loading ? "Validating..." : "Save & Launch"}
            </Button>
          </Stack>

          {displayButtons && (
            <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => navigate("/settings")}
                startIcon={<SettingsIcon />}
              >
                Settings
              </Button>
              <Button
                fullWidth
                variant="text"
                color="error"
                onClick={() => navigate("/")}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ServerConfiguration;
