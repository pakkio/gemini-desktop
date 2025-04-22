import { Box, Typography, Button, Paper } from "@mui/material";
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
// MUI icons
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import GitHubIcon from "@mui/icons-material/GitHub";
import FolderIcon from "@mui/icons-material/Folder";
import GoogleIcon from "@mui/icons-material/Google";
import MapIcon from "@mui/icons-material/Map";
import MemoryIcon from "@mui/icons-material/Memory";
import ChatIcon from "@mui/icons-material/Chat";
import CodeIcon from "@mui/icons-material/Code";
import SearchIcon from "@mui/icons-material/Search";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
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
      // alert("Something went wrong")
    }
  }

  async function saveSettings() {
    try {
      const settingsToBeSaved = {
        leftList,
        rightList,
      };
      console.log(settingsToBeSaved)
      const settings = await post(
        "/api/services/save",
        settingsToBeSaved
      );
      if (!settings.error) {
        setRightList(settings.rightList);
        setLeftList(settings.leftList);
      }
    } catch (e) {
      console.log(e);
      // alert("Something went wrong")
    }
  }

  useEffect(() => {
    getSettings();
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    const sourceList =
      source.droppableId === "left" ? [...leftList] : [...rightList];
    const destList =
      destination.droppableId === "left" ? [...leftList] : [...rightList];

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

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography gutterBottom>
        Drag services from right to left to activate them.
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Grid container spacing={4} mt={2} justifyContent={"space-around"}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Active Services
            </Typography>
            <Droppable droppableId="left">
              {(provided) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ minHeight: 400, p: 2 }}
                >
                  {leftList.map((item, index) => (
                    <Draggable
                      key={item.label}
                      draggableId={item.label}
                      index={index}
                    >
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            mb: 1,
                            p: 1,
                            backgroundColor: "#f5f5f5",
                            borderRadius: 1,
                            boxShadow: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            cursor: "grab",
                          }}
                        >
                          {iconMap[item.label] ?? "🛠️"} {item.label}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Available Services
            </Typography>
            <Droppable droppableId="right">
              {(provided) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ minHeight: 400, p: 2 }}
                >
                  {rightList.map((item, index) => (
                    <Draggable
                      key={item.label}
                      draggableId={item.label}
                      index={index}
                    >
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            mb: 1,
                            p: 1,
                            backgroundColor: "#f0f0f0",
                            borderRadius: 1,
                            boxShadow: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            cursor: "grab",
                          }}
                        >
                          {iconMap[item.label] ?? "🛠️"} {item.label}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Grid>
        </Grid>
      </DragDropContext>

      <Box mt={4} display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={async () => {
           await  saveSettings()
          }}
        >
          Save
        </Button>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
