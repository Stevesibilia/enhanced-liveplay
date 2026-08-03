const path = require('path');
const fs = require('fs');
const state = require('./state');
const { getMimeType } = require('./lib/mime');
const { pathIsInProjectFolder } = require('./lib/path-guard');

// Remote viewer: serves the player display to LAN browsers (e.g. an Android
// tablet) over HTTP, mirroring the local Electron player window.
//
//   GET /player              -> browser build of the shared player renderer
//   GET /player-renderer.js  -> shared renderer script (same file the Electron
//   GET /player-renderer.css    player window loads)
//   GET /media?path=<abs>    -> streams a project media file (path-guarded)
//   GET /events              -> Server-Sent Events stream of displayState pushes
//
// NOTE: these routes are not yet gated behind the operator toggle (that lands
// in a follow-up change). File streaming is confined to the active project
// folder via pathIsInProjectFolder.

// Open SSE connections. Each is an Express `res` we write display-state events to.
const sseClients = new Set();

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Push a displayState to every connected remote viewer. Called from the same
// choke point that feeds the local player window (ipc/player.js push-to-player)
// so both outputs stay in lockstep.
function broadcastDisplayState(displayState) {
  for (const res of sseClients) {
    try {
      sseSend(res, 'display-state', displayState);
    } catch (err) {
      // Broken pipe — drop it; the 'close' handler will also clean up.
      sseClients.delete(res);
    }
  }
}

function registerRemoteViewerRoutes(app) {
  // Shared renderer assets (identical files the Electron player window loads).
  app.get('/player-renderer.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'player-renderer.js'));
  });
  app.get('/player-renderer.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'player-renderer.css'));
  });

  // Browser viewer page (browser transport shim + shared renderer).
  app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'player-browser.html'));
  });

  // Stream a project media file by absolute path, confined to the project folder.
  app.get('/media', (req, res) => {
    const requested = req.query.path;
    if (typeof requested !== 'string' || !requested) {
      return res.status(400).send('Missing path');
    }
    const projectPath = state.getCurrentProject();
    if (!projectPath) {
      // No project loaded: nothing legitimate to serve remotely.
      return res.status(404).send('No project loaded');
    }
    const safePath = pathIsInProjectFolder(requested, projectPath);
    if (!safePath) {
      return res.status(403).send('Forbidden');
    }
    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', getMimeType(safePath));
    fs.createReadStream(safePath)
      .on('error', () => { if (!res.headersSent) res.status(500).end(); })
      .pipe(res);
  });

  // Live displayState stream. On connect, replay the buffered state so a
  // viewer joining (or reconnecting) mid-session shows the current visual.
  app.get('/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n'); // flush headers

    sseClients.add(res);

    const last = state.getLastDisplayState();
    if (last) sseSend(res, 'display-state', last);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });
}

module.exports = { registerRemoteViewerRoutes, broadcastDisplayState };
