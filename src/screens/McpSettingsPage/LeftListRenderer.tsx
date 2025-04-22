/** @jsxImportSource @emotion/react */
import  { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';

const shake = keyframes`
  0% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
  100% { transform: rotate(0); }
`;

const AnimatedIconButton = styled(IconButton)`
  animation: ${shake} 2s infinite;
`;

const ListContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ListItem = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
`;

const getEmptyEnvKeys = (config: any) => {
  if (!config.env) return [];
  return Object.entries(config.env)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
};

const LeftListRenderer = ({
  leftList,
  setLeftList,
}: {
  leftList: any[];
  setLeftList: (list: any[]) => void;
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleEnvChange = (index: number, key: string, value: string) => {
    const updated = [...leftList];
    updated[index].config.env[key] = value;
    setLeftList(updated);
  };

  return (
    <ListContainer>
      {leftList.map((item, index) => {
        const emptyEnvKeys = getEmptyEnvKeys(item.config);
        const showWarning = emptyEnvKeys.length > 0;

        return (
          <ListItem key={item.key}>
            <Box>{item.label}</Box>
            <Box display="flex" alignItems="center" gap={1}>
              {/* 🟢 Your existing buttons go here */}
              {/* Example: <Button variant="outlined" size="small">Run</Button> */}

              {showWarning && (
                <Tooltip title="Missing environment variables">
                  <AnimatedIconButton onClick={() => setOpenIndex(index)} color="warning">
                    <WarningAmberRoundedIcon />
                  </AnimatedIconButton>
                </Tooltip>
              )}
            </Box>

            {/* Modal for env input */}
            <Dialog
              open={openIndex === index}
              onClose={() => setOpenIndex(null)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Configure environment for {item.label}</DialogTitle>
              <DialogContent>
                {Object.entries(item.config.env || {}).map(([key, value]) => (
                  <TextField
                    key={key}
                    fullWidth
                    label={key}
                    margin="dense"
                    value={value}
                    onChange={(e) => handleEnvChange(index, key, e.target.value)}
                  />
                ))}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenIndex(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          </ListItem>
        );
      })}
    </ListContainer>
  );
};

export default LeftListRenderer;
