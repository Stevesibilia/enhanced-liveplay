import type { AudioItem, DuckingBehavior, GroupItem } from '~/types/project';
import { Howl, Howler } from 'howler';
import { linearToDb, dbToLinear, estimateCurrentLevel } from '~/utils/audio';

// Active cue tracking with Howler instances
interface ActiveCueState {
  uuid: string;
  displayName: string;
  duration: number;
  currentTime: number;
  volume: number;
  isDucked: boolean;
  isPaused: boolean; // Track pause state
  originalVolume: number;
  duckedBy: Set<string>; // Track which cues are ducking this one
  howl: Howl;
  progressInterval?: any;
  color?: string;
  inPoint?: number; // Store inPoint for seek operations
  outPoint?: number; // Store outPoint for reference
  currentLevel?: number; // Current audio level in dB (-60 to 0)
  peakLevel?: number; // Peak audio level in dB
  stopFadeTriggered?: boolean; // Track if stop fade has been started
  crossFadeTriggered?: boolean; // Track if crossfade has been started
  // Event-driven transition scheduling (D2)
  crossFadeTimeout?: ReturnType<typeof setTimeout>;
  stopFadeTimeout?: ReturnType<typeof setTimeout>;
  endTimeout?: ReturnType<typeof setTimeout>;
  crossFadeAtMs?: number; // Absolute audio-time target for crossfade trigger (ms)
  stopFadeAtMs?: number; // Absolute audio-time target for stop-fade trigger (ms)
  endAtMs?: number; // Absolute audio-time target for end detection (ms)
}

// Active group tracking for progress indicators
interface ActiveGroupState {
  uuid: string;
  displayName: string;
  totalDuration: number; // Total duration of all auto-playing items
  currentTime: number; // Current progress through the sequence
  playbackChain: string[]; // UUIDs of items that will play in sequence
  currentItemIndex: number; // Index in the playback chain
  lastPlayedItem: string | null; // Last item that played in this group
}

export const useAudioEngine = () => {
  const { currentProject, findItemByUuid, findItemByIndex } = useProject();
  const activeCues = useState<Map<string, ActiveCueState>>('activeCues', () => new Map());
  const activeGroups = useState<Map<string, ActiveGroupState>>('activeGroups', () => new Map());
  const masterOutputLevel = useState<number>('masterOutputLevel', () => -60); // Master output level in dB
  const masterPeakLevel = useState<number>('masterPeakLevel', () => -60); // Master peak level in dB
  const masterGainDb = useState<number>('masterGainDb', () => 0); // Master gain in dB (-60 to 0), 0 = unity

  /**
   * Set master gain and apply to Howler global volume.
   */
  const setMasterGain = (db: number) => {
    const clamped = Math.max(-60, Math.min(0, db));
    masterGainDb.value = clamped;
    Howler.volume(clamped <= -60 ? 0 : dbToLinear(clamped));
  };

  /** Clamp a linear volume value to the range Howler accepts in html5 mode. */
  const clampVolume = (v: number): number => Math.min(Math.max(v, 0), 1);

  // Estimate audio level based on volume and waveform data
  // This samples the waveform at the current playback position
  const estimateAudioLevel = (volume: number, item: AudioItem, currentTime: number): number => {
    if (volume <= 0) return -60;
    
    // Convert volume to dB as base level
    const baseDB = linearToDb(volume);
    
    // Try to get waveform data for more accurate level
    let waveformMultiplier = 0.7; // Default if no waveform (assume 70% average)
    
    if (item.waveform && item.waveform.peaks && item.waveform.peaks.length > 0) {
      const peaks = item.waveform.peaks;
      const duration = item.duration;
      
      // Calculate which peak index corresponds to current time
      // Account for inPoint offset
      const absoluteTime = currentTime + (item.inPoint || 0);
      const progress = absoluteTime / duration;
      const peakIndex = Math.floor(progress * peaks.length);
      
      // Get peak value (0-1) at current position
      if (peakIndex >= 0 && peakIndex < peaks.length) {
        waveformMultiplier = peaks[peakIndex];
        
        // Add slight variation to adjacent peaks for smoother animation
        if (peakIndex > 0 && peakIndex < peaks.length - 1) {
          const avg = (peaks[peakIndex - 1] + peaks[peakIndex] + peaks[peakIndex + 1]) / 3;
          waveformMultiplier = avg;
        }
      }
    }
    
    // Convert waveform multiplier to dB reduction
    // 0.0 = -60dB, 0.5 = -6dB, 1.0 = 0dB
    const waveformDB = linearToDb(waveformMultiplier);
    
    // Combine base volume and waveform level
    const totalDB = baseDB + waveformDB;
    
    return Math.max(-60, Math.min(0, totalDB));
  };

  // Update all cue levels and calculate master output
  const updateAudioLevels = () => {
    let sumLinear = 0; // Sum of linear amplitudes for mixing
    
    for (const cue of activeCues.value.values()) {
      // Find the item to get waveform data
      const item = findItemByUuid(cue.uuid);
      if (!item || item.type !== 'audio') continue;
      
      // Estimate current level based on volume and waveform
      const currentLevel = estimateAudioLevel(cue.volume, item as AudioItem, cue.currentTime);
      cue.currentLevel = currentLevel;
      
      // Update peak hold (decays slowly)
      if (!cue.peakLevel || currentLevel > cue.peakLevel) {
        cue.peakLevel = currentLevel;
      } else {
        // Decay peak hold by 1dB per update cycle
        cue.peakLevel = Math.max(currentLevel, cue.peakLevel - 1);
      }
      
      // Convert dB to linear amplitude for mixing
      const linearAmplitude = dbToLinear(currentLevel);
      sumLinear += linearAmplitude;
    }
    
    // Convert summed linear amplitude back to dB for master meter
    const masterLevel = linearToDb(sumLinear);
    masterOutputLevel.value = Math.max(-60, Math.min(0, masterLevel));
    
    // Update master peak hold
    if (masterLevel > masterPeakLevel.value) {
      masterPeakLevel.value = masterLevel;
    } else {
      masterPeakLevel.value = Math.max(masterLevel, masterPeakLevel.value - 0.5);
    }
    
    // Reset to -60 if no active cues
    if (activeCues.value.size === 0) {
      masterOutputLevel.value = -60;
      masterPeakLevel.value = -60;
    }
  };

  /**
   * Cancel all scheduled event-driven triggers for a cue.
   */
  const cancelCueTriggers = (cue: ActiveCueState) => {
    if (cue.crossFadeTimeout !== undefined) {
      clearTimeout(cue.crossFadeTimeout);
      cue.crossFadeTimeout = undefined;
    }
    if (cue.stopFadeTimeout !== undefined) {
      clearTimeout(cue.stopFadeTimeout);
      cue.stopFadeTimeout = undefined;
    }
    if (cue.endTimeout !== undefined) {
      clearTimeout(cue.endTimeout);
      cue.endTimeout = undefined;
    }
    cue.crossFadeAtMs = undefined;
    cue.stopFadeAtMs = undefined;
    cue.endAtMs = undefined;
  };

  /**
   * Schedule event-driven triggers (crossfade, stop-fade, end) for a cue.
   * Called from onload after howl.duration() is known, and on seek/mutation.
   */
  const scheduleCueTriggers = (cue: ActiveCueState, item: AudioItem) => {
    // Always clear first
    cancelCueTriggers(cue);

    const howl = cue.howl;
    const currentSeek = (howl.seek() as number) || 0;
    const inPoint = item.inPoint || 0;
    const currentAudioTime = currentSeek - inPoint; // position within sprite
    const trimmedDuration = cue.duration; // already computed in onload

    const isCartItem = item.index && item.index.length > 0 && item.index[0] === -1;

    // Crossfade trigger (non-cart, crossFade > 0)
    if (!isCartItem && item.crossFade && item.crossFade > 0) {
      const crossFadeAtMs = (trimmedDuration - item.crossFade) * 1000;
      cue.crossFadeAtMs = crossFadeAtMs;

      const delayMs = crossFadeAtMs - currentAudioTime * 1000;
      if (delayMs > 0) {
        cue.crossFadeTimeout = setTimeout(() => {
          // Guard: cue may have been removed
          if (!activeCues.value.has(item.uuid)) return;
          cue.crossFadeTriggered = true;

          const currentVol = howl.volume();
          howl.fade(currentVol, 0, item.crossFade! * 1000);

          // Resolve next item
          let nextItem: AudioItem | null = null;
          const behavior = item.endBehavior;

          if (behavior.action === 'next') {
            nextItem = getNextItem(item.index);
          } else if (behavior.action === 'goto-item' && behavior.targetUuid) {
            const targetItem = findItemByUuid(behavior.targetUuid);
            if (targetItem && targetItem.type === 'audio') {
              nextItem = targetItem as AudioItem;
            }
          } else if (behavior.action === 'goto-index' && behavior.targetIndex) {
            const targetItem = findItemByIndex(behavior.targetIndex);
            if (targetItem && targetItem.type === 'audio') {
              nextItem = targetItem as AudioItem;
            }
          }

          if (nextItem) {
            startCrossfadeTrack(nextItem, item.crossFade!);
          }
        }, delayMs);
      }
    }
    // Stop-fade trigger (non-cart, stopFade > 0, no effective crossfade)
    else if (!isCartItem && item.stopFade && item.stopFade > 0) {
      const stopFadeAtMs = (trimmedDuration - item.stopFade) * 1000;
      cue.stopFadeAtMs = stopFadeAtMs;

      const delayMs = stopFadeAtMs - currentAudioTime * 1000;
      if (delayMs > 0) {
        cue.stopFadeTimeout = setTimeout(() => {
          if (!activeCues.value.has(item.uuid)) return;
          cue.stopFadeTriggered = true;
          const currentVol = howl.volume();
          howl.fade(currentVol, 0, item.stopFade! * 1000);
        }, delayMs);
      }
    }

    // End-detection timeout (for all non-looping items)
    if (item.endBehavior.action !== 'loop') {
      const endAtMs = trimmedDuration * 1000;
      cue.endAtMs = endAtMs;

      const delayMs = endAtMs - currentAudioTime * 1000;
      if (delayMs > 0) {
        cue.endTimeout = setTimeout(() => {
          if (!activeCues.value.has(item.uuid)) return;
          finalizeCue(item, { fromEnd: true });
        }, delayMs);
      }
    }
  };

  /**
   * Centralised cue terminal cleanup. Idempotent — safe to call multiple times.
   * Consolidates: clear progress interval, cancel triggers, remove from
   * activeCues, restore ducked volumes, group-end propagation, handleEndBehavior.
   */
  const finalizeCue = (item: AudioItem, opts: { fromEnd: boolean }) => {
    const cue = activeCues.value.get(item.uuid);
    if (!cue) return; // already finalized — idempotent guard

    if (cue.progressInterval) clearInterval(cue.progressInterval);
    cancelCueTriggers(cue);

    // Stop the howl unconditionally — in html5 loop mode, playing() can
    // briefly return false between loop iterations, causing a leaked Howl.
    cue.howl.stop();

    activeCues.value.delete(item.uuid);
    restoreDuckedVolumes(item.uuid);

    // Group-end propagation
    const parentGroup = findParentGroup(item.uuid);
    if (parentGroup) {
      const groupState = activeGroups.value.get(parentGroup.uuid);
      if (groupState) {
        const itemIndex = groupState.playbackChain.indexOf(item.uuid);
        if (itemIndex === groupState.playbackChain.length - 1) {
          stopGroupTracking(parentGroup.uuid);
        }
      }
    }

    if (opts.fromEnd) {
      handleEndBehavior(item);
    }
  };

  // Apply ducking behavior (using Howler volume control)
  const applyDucking = (newCueUuid: string, behavior: DuckingBehavior) => {
    const cues = Array.from(activeCues.value.values());

    if (behavior.mode === 'stop-all') {
      // Stop all other cues with fade out
      for (const cue of cues) {
        if (cue.uuid !== newCueUuid) {
          stopCue(cue.uuid);
        }
      }
    } else if (behavior.mode === 'duck-others' && behavior.duckLevel !== undefined) {
      // Lower volume of other cues with fade
      const fadeInDuration = (behavior.duckFadeIn ?? 0.25) * 1000; // Convert to ms
      
      for (const cue of cues) {
        if (cue.uuid !== newCueUuid) {
          if (!cue.isDucked) {
            cue.originalVolume = cue.volume;
            cue.isDucked = true;
          }
          
          // Track that this cue is being ducked by the new cue
          cue.duckedBy.add(newCueUuid);
          
          const duckedVolume = cue.originalVolume * behavior.duckLevel;
          
          // Fade to ducked volume
          cue.howl.fade(cue.volume, duckedVolume, fadeInDuration);
          cue.volume = duckedVolume;
        }
      }
    }
    // 'no-ducking' mode does nothing
  };

  // Restore volumes after ducking
  const restoreDuckedVolumes = (endingCueUuid: string) => {
    const cues = Array.from(activeCues.value.values());
    
    // Check if the ending cue was a ducking cue
    const endingItem = findItemByUuid(endingCueUuid);
    if (!endingItem || endingItem.type !== 'audio') return;
    
    const audioItem = endingItem as AudioItem;
    
    // Only restore if the ending cue had duck-others behavior
    if (audioItem.duckingBehavior.mode === 'duck-others') {
      const fadeOutDuration = (audioItem.duckingBehavior.duckFadeOut ?? 1.0) * 1000; // Convert to ms
      
      // Remove this cue from all duckedBy sets and restore volumes if no other ducking cues remain
      for (const cue of cues) {
        if (cue.duckedBy.has(endingCueUuid)) {
          cue.duckedBy.delete(endingCueUuid);
          
          // If no other cues are ducking this one, restore its volume
          if (cue.duckedBy.size === 0 && cue.isDucked) {
            cue.howl.fade(cue.volume, cue.originalVolume, fadeOutDuration);
            cue.volume = cue.originalVolume;
            cue.isDucked = false;
          }
        }
      }
    }
  };

  /**
   * Build a Howl + ActiveCueState for `item`, register it in `activeCues`,
   * apply ducking, and update group progress. Does NOT call `howl.play()` —
   * the caller decides when and how to start playback (and any fade-in).
   *
   * ## Event-driven cue lifecycle
   *
   * Once `onload` fires and `howl.duration()` is known, `scheduleCueTriggers`
   * arms setTimeout callbacks for crossfade, stop-fade, and end detection.
   * The 100 ms setInterval drives **UI only** (currentTime, levels, group
   * accumulated time) — it never mutates engine state.
   *
   * Terminal cleanup is centralised in `finalizeCue` (idempotent). It is
   * called from:
   *   - The scheduled end-timeout (normal end)
   *   - The `onend` handler (safety net for browser-fired ended events)
   *   - `stopCue` (external stop, after fade-out)
   *
   * Pause/resume cancel and re-arm triggers via `cancelCueTriggers` /
   * `scheduleCueTriggers`. Seek and item-property mutations also reschedule.
   *
   * @param initialVolume Howler volume to start at (linear). Defaults to the
   *   item's target volume; pass `0` for a fade-in.
   */
  const setupCueForPlayback = (item: AudioItem, initialVolume: number = clampVolume(item.volume)): Howl => {
    const audioPath = `${currentProject.value!.folderPath}/media/${item.mediaFileName}`;
    const fileUrl = 'file:///' + audioPath.replace(/\\/g, '/');

    const howl = new Howl({
      src: [fileUrl],
      html5: true,
      volume: initialVolume,
      loop: item.endBehavior.action === 'loop',
      sprite: item.inPoint || item.outPoint ? {
        main: [
          (item.inPoint || 0) * 1000,
          ((item.outPoint || item.duration) - (item.inPoint || 0)) * 1000
        ]
      } : undefined,
      onload: () => {
        const cue = activeCues.value.get(item.uuid);
        if (!cue) return;

        const actualFileDuration = howl.duration();
        const inPoint = item.inPoint || 0;
        const requestedOutPoint = item.outPoint || item.duration;
        const actualOutPoint = Math.min(requestedOutPoint, actualFileDuration);
        const trimmedDuration = actualOutPoint - inPoint;

        cue.duration = trimmedDuration;
        cue.outPoint = actualOutPoint;

        // Arm event-driven triggers (crossfade, stop-fade, end) if flag is on
        scheduleCueTriggers(cue, item);

        cue.progressInterval = setInterval(() => {
          if (!activeCues.value.has(item.uuid)) {
            clearInterval(cue.progressInterval);
            return;
          }

          // seek() returns absolute position in file; subtract inPoint to get
          // position within the sprite.
          const absoluteTime = howl.seek() as number;
          const inPoint = item.inPoint || 0;
          const currentTime = absoluteTime - inPoint;

          // UI-only updates — no engine mutations.
          cue.currentTime = Math.max(0, Math.min(currentTime, cue.duration));
          updateAudioLevels();

          // Update group progress (accumulated time across the chain).
          const parentGroup = findParentGroup(item.uuid);
          if (parentGroup) {
            const groupState = activeGroups.value.get(parentGroup.uuid);
            if (groupState) {
              let accumulatedTime = 0;
              for (let i = 0; i < groupState.currentItemIndex; i++) {
                const uuid = groupState.playbackChain[i];
                const prevItem = findItemByUuid(uuid);
                if (prevItem && prevItem.type === 'audio') {
                  const audioItem = prevItem as AudioItem;
                  accumulatedTime += audioItem.outPoint - audioItem.inPoint;
                }
              }
              groupState.currentTime = accumulatedTime + currentTime;
            }
          }
        }, 100);
      },
      onend: () => {
        // Looping items: Howler manages the loop; do nothing.
        if (item.endBehavior.action === 'loop') return;

        // Safety net — under html5:true, onend may fire at file end rather
        // than sprite end.  finalizeCue is idempotent, so if the scheduled
        // end-timeout already ran this is a no-op.
        finalizeCue(item, { fromEnd: true });
      },
      onloaderror: (_id, error) => {
        console.error('Error loading audio:', error);
        activeCues.value.delete(item.uuid);
      },
      onplayerror: (_id, error) => {
        console.error('Error playing audio:', error);
        activeCues.value.delete(item.uuid);
      }
    });

    const targetVolume = clampVolume(item.volume);
    const activeCue: ActiveCueState = {
      uuid: item.uuid,
      displayName: item.displayName,
      currentTime: 0,
      duration: item.inPoint || item.outPoint
        ? (item.outPoint || item.duration) - (item.inPoint || 0)
        : item.duration,
      volume: targetVolume,
      isDucked: false,
      isPaused: false,
      originalVolume: targetVolume,
      duckedBy: new Set<string>(),
      howl,
      color: item.color,
      inPoint: item.inPoint,
      outPoint: item.outPoint,
      currentLevel: -60,
      peakLevel: -60
    };

    activeCues.value.set(item.uuid, activeCue);
    applyDucking(item.uuid, item.duckingBehavior);
    updateGroupProgress(item.uuid);

    return howl;
  };

  /** Helper: call `howl.play()` with the right sprite argument. */
  const playHowl = (howl: Howl, item: AudioItem) => {
    if (item.inPoint || item.outPoint) howl.play('main');
    else howl.play();
  };

  // Play an audio item (using Howler.js in renderer)
  const playCue = async (item: AudioItem): Promise<boolean> => {
    try {
      if (!import.meta.client || !currentProject.value) return false;

      if (activeCues.value.has(item.uuid)) {
        console.warn('Cue already playing:', item.uuid);
        return false;
      }

      const isCartItem = item.index && item.index.length > 0 && item.index[0] === -1;
      const useFadeIn = !isCartItem && !!item.playFade && item.playFade > 0;

      const howl = setupCueForPlayback(item, useFadeIn ? 0 : clampVolume(item.volume));

      playHowl(howl, item);
      if (useFadeIn) {
        howl.fade(0, clampVolume(item.volume), item.playFade * 1000);
      }

      handleStartBehavior(item);
      scheduleCustomActions(item);
      return true;
    } catch (error) {
      console.error('Error playing cue:', error);
      activeCues.value.delete(item.uuid);
      return false;
    }
  };

  // Stop a cue
  const stopCue = async (uuid: string) => {
    if (!import.meta.client) return;

    const cue = activeCues.value.get(uuid);
    if (cue) {
      try {
        // Get the audio item to retrieve fade out duration
        const item = findItemByUuid(uuid);
        const fadeOutDuration = (item && item.type === 'audio') 
          ? ((item as AudioItem).fadeOutDuration ?? 1.0) * 1000 
          : 1000; // Default 1 second in ms

        // Cancel scheduled triggers immediately so no stale crossfade/
        // stop-fade fires after the cue has been externally stopped.
        cancelCueTriggers(cue);

        // Clear progress interval immediately
        if (cue.progressInterval) {
          clearInterval(cue.progressInterval);
        }

        // Restore ducked volumes BEFORE fading out (so restoration happens in parallel)
        restoreDuckedVolumes(uuid);

        // Fade out before stopping
        cue.howl.fade(cue.volume, 0, fadeOutDuration);
        
        // Remove from active cues immediately (so other functions know it's stopping)
        activeCues.value.delete(uuid);
        
        // Check if this was part of a tracked group
        const parentGroup = findParentGroup(uuid);
        if (parentGroup && activeGroups.value.has(parentGroup.uuid)) {
          const groupState = activeGroups.value.get(parentGroup.uuid);
          if (groupState) {
            const anyGroupItemPlaying = groupState.playbackChain.some(itemUuid => 
              activeCues.value.has(itemUuid)
            );
            if (!anyGroupItemPlaying) {
              stopGroupTracking(parentGroup.uuid);
            }
          }
        }
        
        // Wait for fade to complete, then stop and unload
        setTimeout(() => {
          cue.howl.stop();
          cue.howl.unload();
        }, fadeOutDuration);
        
      } catch (error) {
        console.error('Error stopping cue:', error);
      }
    }
  };

  // Stop all cues
  const stopAllCues = async () => {
    if (!import.meta.client) return;

    try {
      for (const [uuid, cue] of activeCues.value.entries()) {
        if (cue.progressInterval) {
          clearInterval(cue.progressInterval);
        }
        cancelCueTriggers(cue);
        cue.howl.stop();
        cue.howl.unload();
      }
      activeCues.value.clear();
    } catch (error) {
      console.error('Error stopping all cues:', error);
    }
  };

  // Panic stop - fade out all cues over 0.5 seconds then stop
  const panicStop = async () => {
    if (!import.meta.client) return;

    try {
      const fadeOutDuration = 500; // 0.5 seconds in ms
      
      for (const [uuid, cue] of activeCues.value.entries()) {
        cancelCueTriggers(cue);
        cue.howl.fade(cue.volume, 0, fadeOutDuration);
      }
      
      // Wait for fade to complete, then stop all
      setTimeout(() => {
        for (const [uuid, cue] of activeCues.value.entries()) {
          if (cue.progressInterval) {
            clearInterval(cue.progressInterval);
          }
          cancelCueTriggers(cue);
          cue.howl.stop();
          cue.howl.unload();
        }
        activeCues.value.clear();
      }, fadeOutDuration);
    } catch (error) {
      console.error('Error panic stopping cues:', error);
    }
  };

  // Pause a cue
  const pauseCue = async (uuid: string) => {
    if (!import.meta.client) return;

    const cue = activeCues.value.get(uuid);
    if (cue && !cue.isPaused) {
      try {
        cancelCueTriggers(cue);
        cue.howl.pause();
        cue.isPaused = true;
      } catch (error) {
        console.error('Error pausing cue:', error);
      }
    }
  };

  // Resume a paused cue
  const resumeCue = async (uuid: string) => {
    if (!import.meta.client) return;

    const cue = activeCues.value.get(uuid);
    if (cue && cue.isPaused) {
      try {
        cue.howl.play();
        cue.isPaused = false;

        // Re-arm scheduled triggers from current seek position
        const item = findItemByUuid(uuid);
        if (item && item.type === 'audio') {
          scheduleCueTriggers(cue, item as AudioItem);
        }
      } catch (error) {
        console.error('Error resuming cue:', error);
      }
    }
  };

  // Handle end behavior
  const handleEndBehavior = (item: AudioItem) => {
    const behavior = item.endBehavior;

    switch (behavior.action) {
      case 'next':
        playNextItem(item.index);
        break;
      case 'goto-item':
        if (behavior.targetUuid) {
          triggerByUuid(behavior.targetUuid);
        }
        break;
      case 'goto-index':
        if (behavior.targetIndex) {
          triggerByIndex(behavior.targetIndex);
        }
        break;
      case 'loop':
        // Loop is handled by Howler's loop setting, no need to manually re-trigger
        break;
      case 'nothing':
      default:
        break;
    }
  };

  // Handle start behavior
  const handleStartBehavior = (item: AudioItem) => {
    const behavior = item.startBehavior;

    switch (behavior.action) {
      case 'play-next':
        playNextItem(item.index);
        break;
      case 'play-item':
        if (behavior.targetUuid) {
          triggerByUuid(behavior.targetUuid);
        }
        break;
      case 'play-index':
        if (behavior.targetIndex) {
          triggerByIndex(behavior.targetIndex);
        }
        break;
      case 'nothing':
      default:
        break;
    }
  };

  // Schedule custom actions
  const scheduleCustomActions = (item: AudioItem) => {
    item.customActions.forEach(customAction => {
      const timeoutMs = (customAction.timePoint - (item.inPoint || 0)) * 1000;
      
      if (timeoutMs > 0) {
        setTimeout(() => {
          executeCustomAction(customAction.action);
        }, timeoutMs);
      }
    });
  };

  // Execute custom action
  const executeCustomAction = async (action: any) => {
    switch (action.type) {
      case 'play-item':
        triggerByUuid(action.uuid);
        break;
      case 'play-index':
        triggerByIndex(action.index);
        break;
      case 'stop-all':
        stopAllCues();
        break;
      case 'http-request':
        await executeHttpRequest(action.request);
        break;
    }
  };

  // Execute HTTP request
  const executeHttpRequest = async (request: any) => {
    try {
      const options: RequestInit = {
        method: request.method,
        headers: {}
      };

      if (request.body) {
        if (request.contentType === 'json') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(request.body);
        } else {
          options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          options.body = new URLSearchParams(request.body).toString();
        }
      }

      await fetch(request.url, options);
    } catch (error) {
      console.error('Error executing HTTP request:', error);
    }
  };

  // Play next item in sequence
  const playNextItem = (currentIndex: number[]) => {
    const nextIndex = [...currentIndex];
    nextIndex[nextIndex.length - 1]++;

    const nextItem = findItemByIndex(nextIndex);
    if (nextItem) {
      if (nextItem.type === 'audio') {
        playCue(nextItem);
      } else if (nextItem.type === 'group') {
        triggerGroup(nextItem);
      }
    }
  };

  // Get next audio item without triggering it
  const getNextItem = (currentIndex: number[]): AudioItem | null => {
    const nextIndex = [...currentIndex];
    nextIndex[nextIndex.length - 1]++;

    const nextItem = findItemByIndex(nextIndex);
    if (nextItem && nextItem.type === 'audio') {
      return nextItem as AudioItem;
    }
    return null;
  };

  // Start a track with crossfade (fade in over specified duration).
  // Always fades in from 0 — the item's own `playFade` is ignored here.
  const startCrossfadeTrack = async (item: AudioItem, crossfadeDuration: number) => {
    try {
      if (!import.meta.client || !currentProject.value) return;

      if (activeCues.value.has(item.uuid)) {
        console.warn('Cue already playing:', item.uuid);
        return;
      }

      const howl = setupCueForPlayback(item, 0);

      playHowl(howl, item);
      howl.fade(0, clampVolume(item.volume), crossfadeDuration * 1000);

      handleStartBehavior(item);
      scheduleCustomActions(item);
    } catch (error) {
      console.error('Error starting crossfade track:', error);
      activeCues.value.delete(item.uuid);
    }
  };

  // Trigger by UUID
  const triggerByUuid = (uuid: string) => {
    const item = findItemByUuid(uuid);
    if (item) {
      if (item.type === 'audio') {
        playCue(item);
      } else if (item.type === 'group') {
        triggerGroup(item);
      }
    }
  };

  // Trigger by index
  const triggerByIndex = (index: number[]) => {
    const item = findItemByIndex(index);
    if (item) {
      if (item.type === 'audio') {
        playCue(item);
      } else if (item.type === 'group') {
        triggerGroup(item);
      }
    }
  };

  // Calculate the playback chain for a group (items that will play automatically)
  const calculateGroupPlaybackChain = (group: GroupItem, startingItemUuid?: string): string[] => {
    const chain: string[] = [];
    const visited = new Set<string>(); // Prevent infinite loops
    
    // Find starting item
    let currentItem: AudioItem | null = null;
    
    if (startingItemUuid) {
      // Start from specified item
      const item = findItemByUuid(startingItemUuid);
      if (item && item.type === 'audio') {
        currentItem = item as AudioItem;
      }
    } else {
      // Start from first audio item in group based on start behavior
      if (group.startBehavior.action === 'play-first') {
        const firstAudio = findFirstAudioInGroup(group);
        if (firstAudio) currentItem = firstAudio;
      } else {
        // For 'play-all', we don't track group progress
        return [];
      }
    }
    
    if (!currentItem) return [];
    
    // Build the chain by following end behaviors
    while (currentItem && !visited.has(currentItem.uuid)) {
      visited.add(currentItem.uuid);
      chain.push(currentItem.uuid);
      
      const endBehavior = currentItem.endBehavior;
      
      if (endBehavior.action === 'next') {
        // Find next item in the group
        const nextItem = findNextItemInGroup(group, currentItem);
        if (nextItem && nextItem.type === 'audio') {
          currentItem = nextItem as AudioItem;
        } else {
          break; // No more items
        }
      } else if (endBehavior.action === 'goto-item' && endBehavior.targetUuid) {
        const targetItem = findItemByUuid(endBehavior.targetUuid);
        
        // Check if target is in the same group
        if (targetItem && targetItem.type === 'audio' && isItemInGroup(group, targetItem.uuid)) {
          // Check if we're going forward or backward
          const targetIndex = chain.indexOf(targetItem.uuid);
          if (targetIndex === -1) {
            // Going forward - add to chain
            currentItem = targetItem as AudioItem;
          } else {
            // Going backward (loop) - reset chain
            return [targetItem.uuid];
          }
        } else {
          // Jumping outside group - stop tracking
          break;
        }
      } else if (endBehavior.action === 'goto-index' && endBehavior.targetIndex) {
        const targetItem = findItemByIndex(endBehavior.targetIndex);
        
        if (targetItem && targetItem.type === 'audio' && isItemInGroup(group, targetItem.uuid)) {
          const targetIndex = chain.indexOf(targetItem.uuid);
          if (targetIndex === -1) {
            currentItem = targetItem as AudioItem;
          } else {
            return [targetItem.uuid];
          }
        } else {
          break;
        }
      } else if (endBehavior.action === 'loop') {
        // Single item loop - don't continue chain
        break;
      } else {
        // 'nothing' or unknown - stop chain
        break;
      }
    }
    
    return chain;
  };
  
  // Helper: Find first audio item in group (recursively)
  const findFirstAudioInGroup = (group: GroupItem): AudioItem | null => {
    for (const child of group.children) {
      if (child.type === 'audio') {
        return child as AudioItem;
      } else if (child.type === 'group') {
        const found = findFirstAudioInGroup(child as GroupItem);
        if (found) return found;
      }
    }
    return null;
  };
  
  // Helper: Find next item in group
  const findNextItemInGroup = (group: GroupItem, currentItem: AudioItem): AudioItem | GroupItem | null => {
    const flatten = (items: any[]): any[] => {
      const result: any[] = [];
      for (const item of items) {
        result.push(item);
        if (item.type === 'group') {
          result.push(...flatten(item.children));
        }
      }
      return result;
    };
    
    const allItems = flatten(group.children);
    const currentIndex = allItems.findIndex(item => item.uuid === currentItem.uuid);
    
    if (currentIndex >= 0 && currentIndex < allItems.length - 1) {
      return allItems[currentIndex + 1];
    }
    
    return null;
  };
  
  // Helper: Check if item is in group
  const isItemInGroup = (group: GroupItem, itemUuid: string): boolean => {
    for (const child of group.children) {
      if (child.uuid === itemUuid) return true;
      if (child.type === 'group') {
        if (isItemInGroup(child as GroupItem, itemUuid)) return true;
      }
    }
    return false;
  };
  
  // Find parent group of an item
  const findParentGroup = (itemUuid: string): GroupItem | null => {
    if (!currentProject.value) return null;
    
    const searchInGroup = (group: GroupItem): GroupItem | null => {
      for (const child of group.children) {
        if (child.uuid === itemUuid) return group;
        if (child.type === 'group') {
          const found = searchInGroup(child as GroupItem);
          if (found) return found;
        }
      }
      return null;
    };
    
    for (const item of currentProject.value.items) {
      if (item.type === 'group') {
        const found = searchInGroup(item as GroupItem);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  // Start tracking a group
  const startGroupTracking = (group: GroupItem, startingItemUuid?: string) => {
    const chain = calculateGroupPlaybackChain(group, startingItemUuid);
    
    if (chain.length === 0) return; // Can't track 'play-all' groups
    
    // Calculate total duration
    let totalDuration = 0;
    for (const itemUuid of chain) {
      const item = findItemByUuid(itemUuid);
      if (item && item.type === 'audio') {
        const audioItem = item as AudioItem;
        const duration = audioItem.outPoint - audioItem.inPoint;
        totalDuration += duration;
      }
    }
    
    activeGroups.value.set(group.uuid, {
      uuid: group.uuid,
      displayName: group.displayName,
      totalDuration,
      currentTime: 0,
      playbackChain: chain,
      currentItemIndex: 0,
      lastPlayedItem: null
    });
  };
  
  // Update group progress when an item plays
  const updateGroupProgress = (itemUuid: string) => {
    // Find which group this item belongs to
    const parentGroup = findParentGroup(itemUuid);
    if (!parentGroup) return;
    
    const groupState = activeGroups.value.get(parentGroup.uuid);
    if (!groupState) {
      // Start tracking if not already
      startGroupTracking(parentGroup, itemUuid);
      return;
    }
    
    // Check if this item is in the playback chain
    const itemIndex = groupState.playbackChain.indexOf(itemUuid);
    
    if (itemIndex === -1) {
      // Item not in chain - recalculate from this item
      const newChain = calculateGroupPlaybackChain(parentGroup, itemUuid);
      if (newChain.length > 0) {
        let totalDuration = 0;
        for (const uuid of newChain) {
          const item = findItemByUuid(uuid);
          if (item && item.type === 'audio') {
            const audioItem = item as AudioItem;
            totalDuration += audioItem.outPoint - audioItem.inPoint;
          }
        }
        
        groupState.playbackChain = newChain;
        groupState.totalDuration = totalDuration;
        groupState.currentItemIndex = 0;
        groupState.currentTime = 0;
        groupState.lastPlayedItem = itemUuid;
      }
    } else if (groupState.lastPlayedItem) {
      // Check if we're going backward
      const lastIndex = groupState.playbackChain.indexOf(groupState.lastPlayedItem);
      if (lastIndex > itemIndex) {
        // Going backward - reset and recalculate
        const newChain = calculateGroupPlaybackChain(parentGroup, itemUuid);
        if (newChain.length > 0) {
          let totalDuration = 0;
          for (const uuid of newChain) {
            const item = findItemByUuid(uuid);
            if (item && item.type === 'audio') {
              const audioItem = item as AudioItem;
              totalDuration += audioItem.outPoint - audioItem.inPoint;
            }
          }
          
          groupState.playbackChain = newChain;
          groupState.totalDuration = totalDuration;
          groupState.currentItemIndex = 0;
          groupState.currentTime = 0;
        }
      } else {
        // Going forward - update position
        groupState.currentItemIndex = itemIndex;
        
        // Calculate current time (sum of durations of previous items)
        let accumulatedTime = 0;
        for (let i = 0; i < itemIndex; i++) {
          const uuid = groupState.playbackChain[i];
          const item = findItemByUuid(uuid);
          if (item && item.type === 'audio') {
            const audioItem = item as AudioItem;
            accumulatedTime += audioItem.outPoint - audioItem.inPoint;
          }
        }
        groupState.currentTime = accumulatedTime;
      }
    }
    
    groupState.lastPlayedItem = itemUuid;
  };
  
  // Stop tracking a group
  const stopGroupTracking = (groupUuid: string) => {
    activeGroups.value.delete(groupUuid);
  };

  // Trigger a group
  const triggerGroup = (group: any) => {
    // Start tracking group progress
    startGroupTracking(group);
    
    if (group.startBehavior.action === 'play-first') {
      if (group.children.length > 0) {
        const firstChild = group.children[0];
        if (firstChild.type === 'audio') {
          playCue(firstChild);
        } else if (firstChild.type === 'group') {
          triggerGroup(firstChild);
        }
      }
    } else if (group.startBehavior.action === 'play-all') {
      group.children.forEach((child: any) => {
        if (child.type === 'audio') {
          playCue(child);
        } else if (child.type === 'group') {
          triggerGroup(child);
        }
      });
    }
  };

  // Seek to a position within a cue. Reschedules event-driven triggers.
  const seekCue = async (uuid: string, absoluteTime: number) => {
    if (!import.meta.client) return;

    const cue = activeCues.value.get(uuid);
    if (cue) {
      try {
        cue.howl.seek(absoluteTime);

        // Reset triggered flags so triggers can re-fire after seeking backward
        cue.crossFadeTriggered = false;
        cue.stopFadeTriggered = false;

        // Reschedule triggers from new position
        const item = findItemByUuid(uuid);
        if (item && item.type === 'audio') {
          scheduleCueTriggers(cue, item as AudioItem);
        }
      } catch (error) {
        console.error('Error seeking cue:', error);
      }
    }
  };

  // Set volume on a playing cue in real time
  const setVolume = (uuid: string, volume: number) => {
    if (!import.meta.client) return;

    const cue = activeCues.value.get(uuid);
    if (cue) {
      const appliedVolume = clampVolume(volume);
      cue.howl.volume(appliedVolume);
      cue.volume = appliedVolume;
      cue.originalVolume = appliedVolume;
    }
  };

  const setLoopForCue = (uuid: string, loop: boolean) => {
    const cue = activeCues.value.get(uuid);
    if (!cue) return;
    cue.howl.loop(loop);
    // Reschedule triggers — cancels stale endTimeout when looping on,
    // re-arms it when looping off.
    const item = findItemByUuid(uuid);
    if (item && item.type === 'audio') {
      scheduleCueTriggers(cue, item as AudioItem);
    }
  };

  /**
   * Reschedule event-driven triggers for an active cue whose item properties
   * (crossFade, stopFade, inPoint, outPoint) changed while playing.
   * Debounced at 100 ms — safe to call on every slider drag.
   */
  const _rescheduleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const rescheduleCueTriggers = (uuid: string) => {
    // Debounce per cue
    const existing = _rescheduleTimers.get(uuid);
    if (existing) clearTimeout(existing);

    _rescheduleTimers.set(uuid, setTimeout(() => {
      _rescheduleTimers.delete(uuid);
      const cue = activeCues.value.get(uuid);
      if (!cue) return;
      const item = findItemByUuid(uuid);
      if (!item || item.type !== 'audio') return;

      // Reset triggered flags so changed triggers can fire
      cue.crossFadeTriggered = false;
      cue.stopFadeTriggered = false;
      scheduleCueTriggers(cue, item as AudioItem);
    }, 100));
  };

  return {
    activeCues,
    activeGroups,
    masterOutputLevel,
    masterPeakLevel,
    masterGainDb,
    setMasterGain,
    playCue,
    stopCue,
    stopAllCues,
    panicStop,
    pauseCue,
    resumeCue,
    seekCue,
    setVolume,
    setLoopForCue,
    rescheduleCueTriggers,
    triggerByUuid,
    triggerByIndex,
    triggerGroup
  };
};
