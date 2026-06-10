const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const state = require('../state');

// Registers the waveform-generation IPC handler. Called once from main.js.
function register() {
  // Waveform generation
  ipcMain.handle('generate-waveform', async (event, audioFilePath, outputPath) => {
    return new Promise((resolve, reject) => {
      console.log('Generating waveform for:', audioFilePath);
      console.log('Output path:', outputPath);
    
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    
      // Use the detected ffmpeg path
      const ffmpegPath = state.getFfmpegPath();
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
      }
    
      // First, get the duration
      ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
        if (err) {
          console.error('FFprobe error:', err);
          reject(err);
          return;
        }
      
        const duration = metadata.format.duration;
        if (!duration) {
          reject(new Error('Could not determine audio duration'));
          return;
        }
      
        // Calculate samples: 10 per second
        const targetSamples = Math.ceil(duration * 10);
        const samples = [];
        const tempOutput = outputPath + '.temp.wav';
      
        // Extract raw audio data
        ffmpeg(audioFilePath)
          .audioChannels(1)
          .audioFrequency(8000) // Lower frequency for smaller data
          .format('s16le')
          .on('error', (err) => {
            console.error('FFmpeg waveform error:', err);
            reject(err);
          })
          .on('end', () => {
            // Read the temp file and process samples
            try {
              if (fs.existsSync(tempOutput)) {
                const buffer = fs.readFileSync(tempOutput);
              
                // Process samples to get exactly 10 per second
                const sampleInterval = Math.floor(buffer.length / (targetSamples * 2)); // 2 bytes per sample
              
                for (let i = 0; i < buffer.length - 1 && samples.length < targetSamples; i += sampleInterval * 2) {
                  const sample = buffer.readInt16LE(i) / 32768.0; // Normalize to -1 to 1
                  samples.push(Math.abs(sample));
                }
              
                // Clean up temp file
                fs.unlinkSync(tempOutput);
              
                // Save waveform data (including duration for convenience)
                const waveformData = {
                  peaks: samples,
                  sampleRate: 10, // 10 samples per second
                  duration: duration // Include duration in seconds
                };
              
                fs.writeFileSync(outputPath, JSON.stringify(waveformData));
                console.log('Waveform generated successfully:', samples.length, 'samples @10/sec for', duration.toFixed(2), 'seconds');
              
                resolve({ success: true });
              } else {
                reject(new Error('Temporary audio file not created'));
              }
            } catch (error) {
              console.error('Error processing waveform:', error);
              reject(error);
            }
          })
          .save(tempOutput);
      });
    });
  });
}

module.exports = { register };
