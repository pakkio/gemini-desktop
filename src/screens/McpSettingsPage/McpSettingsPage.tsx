import {
  Box,
  Typography,
  Button,
  Paper,
  Fade,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { get, post } from "../../utils/api_helper/api_helper";
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  GitHub as GitHubIcon,
  Folder as FolderIcon,
  Google as GoogleIcon,
  Map as MapIcon,
  Memory as MemoryIcon,
  Chat as ChatIcon,
  Code as CodeIcon,
  Search as SearchIcon,
  IntegrationInstructions as IntegrationInstructionsIcon,
} from "@mui/icons-material";
import { serviceConfigs } from "../../utils/serviceConfigs";

const labelKeyMap: Record<string, string> = {
  "AWS KB Retrieval": "aws-kb-retrieval",
  "Brave Search": "brave-search",
  EverArt: "everart",
  Everything: "everything",
  Filesystem: "filesystem",
  GitHub: "github",
  "Google Drive": "gdrive",
  "Google Maps": "google-maps",
  PostgreSQL: "postgres",
  Puppeteer: "puppeteer",
  Redis: "redis",
  "Sequential Thinking": "sequential-thinking",
  Slack: "slack",
  Memory: "memory",
  GitLab: "gitlab",
};

const iconMap: Record<string, JSX.Element> = {
  "AWS KB Retrieval": <CloudIcon />,
  "Brave Search": <SearchIcon />,
  EverArt: <IntegrationInstructionsIcon />,
  Everything: <SearchIcon />,
  Filesystem: <FolderIcon />,
  Git: <CodeIcon />,
  GitHub: <GitHubIcon />,
  GitLab: <CodeIcon />,
  "Google Drive": <GoogleIcon />,
  "Google Maps": <MapIcon />,
  Memory: <MemoryIcon />,
  PostgreSQL: <StorageIcon />,
  Puppeteer: <IntegrationInstructionsIcon />,
  Redis: <StorageIcon />,
  "Sequential Thinking": <ChatIcon />,
  Slack: <ChatIcon />,
};

type ServiceItem = {
  label: string;
  key: string;
  config: any;
};

const defaultRightList: ServiceItem[] = Object.keys(iconMap).map((label) => {
  const key = labelKeyMap[label];
  return {
    label,
    key,
    config: serviceConfigs[key] ?? {},
  };
});

const initialLeftList: ServiceItem[] = [];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [leftList, setLeftList] = useState(initialLeftList);
  const [rightList, setRightList] = useState(defaultRightList);

  async function getSettings() {
    try {
      const settings = await get("/api/services/get");
      if (!settings.error) {
        setRightList(settings.rightList);
        setLeftList(settings.leftList);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function saveSettings() {
    try {
      const settingsToBeSaved = { leftList, rightList };
      const settings = await post("/api/services/save", settingsToBeSaved);
      if (!settings.error) {
        setRightList(settings.rightList);
        setLeftList(settings.leftList);
      }
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    getSettings();
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId &&
      source.index === destination.index)) return;

    const sourceList = [...(source.droppableId === "left" ? leftList : rightList)];
    const destList = [...(destination.droppableId === "left" ? leftList : rightList)];

    const [movedItem] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, movedItem);

    if (source.droppableId === "left") {
      setLeftList(sourceList);
      setRightList(destList);
    } else {
      setRightList(sourceList);
      setLeftList(destList);
    }
  };

  const renderList = (
    items: ServiceItem[],
    droppableId: string,
    color: string
  ) => {
    const isRightList = droppableId === "right";
  
    return (
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <Paper
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              minHeight: 400,
              p: 2,
              backgroundColor: color,
              transition: "background-color 0.3s",
              borderRadius: 2,
              boxShadow: 3,
              display: isRightList ? "grid" : "flex",
              flexDirection: isRightList ? undefined : "column",
              gap: isRightList ? 2 : 1.5, // spacing: 16px for right, 12px for left
              ...(isRightList && {
                gridTemplateColumns: "1fr 1fr", // 2 columns
              }),
            }}
          >
            {items.map((item, index) => (
              <Draggable key={item.label} draggableId={item.label} index={index}>
                {(provided) => (
                  <Fade in timeout={400}>
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        p: 1.5,
                        backgroundColor: "#ffffff",
                        borderRadius: 2,
                        boxShadow: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        transition: "transform 0.2s, box-shadow 0.2s",
                        ":hover": {
                          boxShadow: 4,
                          transform: "scale(1.02)",
                        },
                        cursor: "grab",
                      }}
                    >
                      {iconMap[item.label] ?? "🛠️"}
                      <Typography variant="body1" fontWeight={500}>
                        {item.label}
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Paper>
        )}
      </Droppable>
    );
  };
  

  return (
    <Box p={4}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Manage MCP Servers
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Drag servers from right to left to enable them for the LLM.
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Grid container spacing={4} mt={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Enabled MCP Servers (used by LLM)
            </Typography>
            {renderList(leftList, "left", "#f0f7fa")}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Available MCP Servers
            </Typography>
            {renderList(rightList, "right", "#fff3e0")}
          </Grid>
        </Grid>
      </DragDropContext>

      <Stack mt={4} direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={saveSettings}>
          Save Changes
        </Button>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => navigate("/server-config")}
        >
          Configure New Server
        </Button>
      </Stack>
    </Box>
  );
}
