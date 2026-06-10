const express = require('express');
const state = require('./state');

// API Server Setup
function startAPIServer(port = 8080, maxAttempts = 10) {
  const apiApp = express();
  apiApp.use(express.json());

  // Trigger item by UUID
  apiApp.get('/api/trigger/uuid/:uuid', (req, res) => {
    const { uuid } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('trigger-item', { type: 'uuid', value: uuid });
      res.json({ success: true, message: `Triggered item ${uuid}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Trigger item by index
  apiApp.get('/api/trigger/index/:index', (req, res) => {
    const { index } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      const indexArray = index.split(',').map(i => parseInt(i.trim()));
      mainWindow.webContents.send('trigger-item', { type: 'index', value: indexArray });
      res.json({ success: true, message: `Triggered item at index ${index}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Stop item
  apiApp.get('/api/stop/uuid/:uuid', (req, res) => {
    const { uuid } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('stop-item', { type: 'uuid', value: uuid });
      res.json({ success: true, message: `Stopped item ${uuid}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Get current project info
  apiApp.get('/api/project/info', (req, res) => {
    const currentProject = state.getCurrentProject();
    if (currentProject) {
      res.json({ success: true, project: currentProject });
    } else {
      res.status(404).json({ success: false, message: 'No project loaded' });
    }
  });

  // Try to start server, incrementing port if already in use
  const tryListen = (currentPort, attemptsLeft) => {
    const server = apiApp.listen(currentPort)
      .on('listening', () => {
        state.setApiServer(server);
        console.log(`E-LivePlay API Server running on http://localhost:${currentPort}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          tryListen(currentPort + 1, attemptsLeft - 1);
        } else if (err.code === 'EADDRINUSE') {
          console.error(`Failed to start API server after ${maxAttempts} attempts. Ports ${port}-${currentPort} are all in use.`);
        } else {
          console.error('Failed to start API server:', err);
        }
      });
  };

  tryListen(port, maxAttempts - 1);
}

module.exports = { startAPIServer };
