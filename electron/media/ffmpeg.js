const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const ffmpeg = require('fluent-ffmpeg');
const state = require('../state');

const execPromise = promisify(exec);

// Setup bundled ffmpeg - always use the bundled version to avoid
// issues on OS's with strict security requirements
async function checkAndSetupFfmpeg() {
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    let ffmpegPath = ffmpegInstaller.path;
    
    // In packaged app, the path may be inside app.asar - resolve it
    if (ffmpegPath.includes('app.asar')) {
      ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }
    
    // Verify bundled version works
    await execPromise(`"${ffmpegPath}" -version`);
    state.setFfmpegPath(ffmpegPath);
    state.setFfmpegAvailable(true);
    console.log('Using bundled ffmpeg:', ffmpegPath);
    
    // Set ffprobe path from @ffprobe-installer/ffprobe
    try {
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
      let ffprobePath = ffprobeInstaller.path;
      if (ffprobePath.includes('app.asar')) {
        ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked');
      }
      ffmpeg.setFfprobePath(ffprobePath);
      console.log('Using bundled ffprobe:', ffprobePath);
    } catch (e) {
      // Fallback: try ffprobe next to ffmpeg
      const ffprobeFileName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
      const ffprobePath = path.join(path.dirname(ffmpegPath), ffprobeFileName);
      if (fs.existsSync(ffprobePath)) {
        ffmpeg.setFfprobePath(ffprobePath);
        console.log('Using ffprobe from ffmpeg directory:', ffprobePath);
      } else {
        // Fallback: try system-wide ffprobe from PATH
        try {
          const whichProbeCmd = process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe';
          const probeResult = await execPromise(whichProbeCmd);
          const systemProbePath = probeResult.stdout.trim().split('\n')[0].trim();
          ffmpeg.setFfprobePath(systemProbePath);
          console.log('Using system ffprobe:', systemProbePath);
        } catch (probeErr) {
          console.warn('ffprobe not found, some features may be limited');
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to setup bundled ffmpeg:', error);
    
    // Fallback: try system-wide ffmpeg from PATH
    try {
      const whichCmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
      const { stdout } = await execPromise(whichCmd);
      const systemFfmpegPath = stdout.trim().split('\n')[0].trim();
      
      // Verify the system binary works
      await execPromise(`"${systemFfmpegPath}" -version`);
      state.setFfmpegPath(systemFfmpegPath);
      state.setFfmpegAvailable(true);
      console.log('Using system ffmpeg:', systemFfmpegPath);
      
      // Try to find system ffprobe too
      try {
        const whichProbeCmd = process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe';
        const probeResult = await execPromise(whichProbeCmd);
        const systemFfprobePath = probeResult.stdout.trim().split('\n')[0].trim();
        ffmpeg.setFfprobePath(systemFfprobePath);
        console.log('Using system ffprobe:', systemFfprobePath);
      } catch (probeErr) {
        console.warn('System ffprobe not found, some features may be limited');
      }
      
      return true;
    } catch (systemError) {
      console.error('System ffmpeg not found either:', systemError.message);
      state.setFfmpegAvailable(false);
      return false;
    }
  }
}

module.exports = { checkAndSetupFfmpeg };
