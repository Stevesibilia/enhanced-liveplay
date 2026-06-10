const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const YTDlpWrap = require('yt-dlp-wrap').default;
const youtubesearchapi = require('youtube-search-api');
const state = require('../state');

const execPromise = promisify(exec);

// Initialize yt-dlp wrapper
async function initializeYtDlp() {
  try {
    // Set up download directory in user data folder
    const binDir = path.join(app.getPath('userData'), 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    const exeName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const binaryPath = path.join(binDir, exeName);
    
    console.log('Initializing yt-dlp...');
    console.log('Binary directory:', binDir);
    console.log('Binary path:', binaryPath);
    
    // Check if binary needs updating
    // Re-download if: binary doesn't exist, or it's older than 7 days
    let needsDownload = !fs.existsSync(binaryPath);
    
    if (!needsDownload) {
      try {
        const stats = fs.statSync(binaryPath);
        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageInDays > 7) {
          console.log(`yt-dlp binary is ${Math.round(ageInDays)} days old, will update...`);
          needsDownload = true;
        } else {
          console.log(`yt-dlp binary is ${Math.round(ageInDays)} days old, using existing`);
        }
      } catch (e) {
        needsDownload = true;
      }
    }
    
    if (needsDownload) {
      console.log('Downloading latest yt-dlp binary...');
      // Back up old binary in case download fails
      const backupPath = binaryPath + '.bak';
      try {
        if (fs.existsSync(binaryPath)) {
          fs.copyFileSync(binaryPath, backupPath);
          fs.unlinkSync(binaryPath);
        }
        state.setYtDlpPath(await YTDlpWrap.downloadFromGithub(binaryPath));
        // Clean up backup on success
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      } catch (downloadError) {
        console.error('Failed to download yt-dlp:', downloadError);
        // Restore backup if download failed
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, binaryPath);
          fs.unlinkSync(backupPath);
          console.log('Restored previous yt-dlp binary as fallback');
        } else if (!fs.existsSync(binaryPath)) {
          throw downloadError;
        }
      }
    }
    
    // Verify the binary exists and is usable
    if (fs.existsSync(binaryPath)) {
      state.setYtDlpPath(binaryPath);
      state.setYtDlpReady(true);
      
      // Log version for debugging
      try {
        const { stdout } = await execPromise(`"${binaryPath}" --version`);
        console.log('yt-dlp version:', stdout.trim());
      } catch (e) {
        console.log('Could not determine yt-dlp version');
      }
      
      return true;
    } else {
      throw new Error('yt-dlp binary not found after initialization');
    }
  } catch (error) {
    console.error('Failed to initialize yt-dlp:', error);
    state.setYtDlpReady(false);
    return false;
  }
}

// Registers the YouTube search/download IPC handlers. Called once from main.js.
function register() {
  // YouTube Search Handler
  ipcMain.handle('search-youtube', async (event, query) => {
    try {
      const result = await youtubesearchapi.GetListByKeyword(query, false, 20, [{ type: 'video' }]);
    
      // Format results
      const videos = result.items.map(item => ({
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail.thumbnails[item.thumbnail.thumbnails.length - 1].url,
        channelTitle: item.channelTitle,
        length: item.length?.simpleText || ''
      }));
    
      return videos;
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube');
    }
  });

  // YouTube Download Handler
  ipcMain.handle('download-youtube-audio', async (event, videoId, title, projectFolderPath) => {
    return new Promise(async (resolve, reject) => {
      console.log('YouTube download - Project folder path:', projectFolderPath);
    
      const outputPath = path.join(projectFolderPath, 'media');
      console.log('YouTube download - Output path:', outputPath);
    
      // Ensure output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
        console.log('Created media directory:', outputPath);
      }
    
      // Clean filename
      const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 200);
      const fileName = `${sanitizedTitle}.mp3`;
      const outputTemplate = path.join(outputPath, sanitizedTitle);
    
      console.log('YouTube download - Output template:', outputTemplate);
    
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
      console.log(`Starting YouTube download: ${videoId} -> ${fileName}`);
      console.log(`Video URL: ${videoUrl}`);
    
      // Wait for yt-dlp to be ready (with timeout)
      if (!state.getYtDlpReady()) {
        console.log('Waiting for yt-dlp to initialize...');
        let attempts = 0;
        while (!state.getYtDlpReady() && attempts < 30) { // Wait up to 30 seconds
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      
        if (!state.getYtDlpReady()) {
          reject(new Error('yt-dlp initialization timed out. Please try again.'));
          return;
        }
      }
    
      if (!state.getYtDlpPath()) {
        reject(new Error('yt-dlp binary path not available. Please restart the application.'));
        return;
      }
    
      if (!state.getFfmpegAvailable()) {
        reject(new Error('Bundled FFmpeg failed to initialize. Please restart the application.'));
        return;
      }
    
      try {
        // Create YTDlpWrap instance with the binary path
        const ytDlp = new YTDlpWrap(state.getYtDlpPath());
      
        // Build yt-dlp arguments
        const args = [
          videoUrl,
          '-f', 'bestaudio',
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '0', // Best quality
          '-o', outputTemplate + '.%(ext)s',
          '--no-playlist',
          '--progress',
          '--newline' // Force progress on new lines for easier parsing
        ];
      
        // Add ffmpeg path if we have it
        const ffmpegPath = state.getFfmpegPath();
        if (ffmpegPath) {
          args.push('--ffmpeg-location', ffmpegPath);
        }
      
        console.log('Running yt-dlp with args:', args);
        console.log('yt-dlp path:', state.getYtDlpPath());
      
        // Use spawn to get a proper ChildProcess
        const { spawn } = require('child_process');
        const downloadProcess = spawn(state.getYtDlpPath(), args);
      
        // Check if downloadProcess is valid
        if (!downloadProcess || !downloadProcess.stdout) {
          throw new Error('Failed to start yt-dlp process');
        }
      
        let lastProgress = 0;
      
        // Track progress by parsing stdout
        downloadProcess.stdout.on('data', (data) => {
          const output = data.toString();
        
          // Parse download progress
          const downloadMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (downloadMatch) {
            const percentage = parseFloat(downloadMatch[1]);
            if (percentage > lastProgress) {
              lastProgress = percentage;
              event.sender.send('youtube-download-progress', {
                videoId,
                percentage: percentage,
                status: percentage < 100 ? 'downloading' : 'converting'
              });
            }
          }
        
          // Check for post-processing
          if (output.includes('[ExtractAudio]') || output.includes('Destination:')) {
            event.sender.send('youtube-download-progress', {
              videoId,
              percentage: 95,
              status: 'converting'
            });
          }
        });
      
        downloadProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          // yt-dlp uses stderr for normal output, only log actual errors
          if (errorOutput.includes('ERROR')) {
            console.error('yt-dlp error:', errorOutput);
          }
        });
      
        downloadProcess.on('error', (error) => {
          console.error('yt-dlp process error:', error);
          reject(new Error(`Download process failed: ${error.message}`));
        });
      
        downloadProcess.on('close', (code) => {
          console.log(`yt-dlp process closed with code: ${code}`);
        
          if (code !== 0) {
            reject(new Error(`yt-dlp exited with code ${code}`));
            return;
          }
        
          console.log(`Download completed: ${fileName}`);
        
          // Find the actual downloaded file (yt-dlp might use URL encoding)
          const expectedFile = path.join(outputPath, fileName);
          let actualFile = expectedFile;
        
          // Check if file exists with expected name
          if (!fs.existsSync(expectedFile)) {
            // Try to find it with URL-encoded name or other variations
            const files = fs.readdirSync(outputPath);
            const baseName = sanitizedTitle;
          
            // Look for files that match the base name (case-insensitive, with any encoding)
            const matchingFile = files.find(f => {
              const decoded = decodeURIComponent(f);
              return decoded.toLowerCase().startsWith(baseName.toLowerCase()) && f.endsWith('.mp3');
            });
          
            if (matchingFile) {
              actualFile = path.join(outputPath, matchingFile);
              console.log('Found downloaded file:', matchingFile);
            
              // Rename to expected filename if different
              if (matchingFile !== fileName) {
                try {
                  fs.renameSync(actualFile, expectedFile);
                  actualFile = expectedFile;
                  console.log('Renamed file to:', fileName);
                } catch (renameError) {
                  console.error('Failed to rename file:', renameError);
                }
              }
            } else {
              console.error('Could not find downloaded file. Files in directory:', files);
              reject(new Error('Downloaded file not found in expected location'));
              return;
            }
          }
        
          // Send 100% progress
          event.sender.send('youtube-download-progress', {
            videoId,
            percentage: 100,
            status: 'completed'
          });
        
          resolve({
            success: true,
            file: actualFile,
            fileName: path.basename(actualFile),
            title: sanitizedTitle
          });
        });
      
      } catch (error) {
        console.error('YouTube download error:', error);
        console.error('Error stack:', error.stack);
      
        // Clean up partial file
        const outputFile = path.join(outputPath, fileName);
        if (fs.existsSync(outputFile)) {
          try {
            fs.unlinkSync(outputFile);
          } catch (e) {
            console.error('Failed to clean up file:', e);
          }
        }
      
        reject(new Error(`Download failed: ${error.message}`));
      }
    });
  });
}

module.exports = { initializeYtDlp, register };
