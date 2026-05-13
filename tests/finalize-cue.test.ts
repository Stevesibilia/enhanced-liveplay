import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for finalizeCue idempotence and cue lifecycle using stubs.
 * Since finalizeCue lives inside the composable closure, we test the
 * pattern by simulating the map + callback contract directly.
 */

interface StubCue {
  uuid: string;
  progressInterval?: ReturnType<typeof setInterval>;
  crossFadeTimeout?: ReturnType<typeof setTimeout>;
  stopFadeTimeout?: ReturnType<typeof setTimeout>;
  endTimeout?: ReturnType<typeof setTimeout>;
  howl: { playing: () => boolean; stop: () => void };
}

function createStubFinalizeCue(
  activeCues: Map<string, StubCue>,
  handleEndBehavior: (uuid: string) => void,
) {
  return (uuid: string, opts: { fromEnd: boolean }) => {
    const cue = activeCues.get(uuid);
    if (!cue) return; // idempotent guard

    if (cue.progressInterval) clearInterval(cue.progressInterval);
    if (cue.crossFadeTimeout) clearTimeout(cue.crossFadeTimeout);
    if (cue.stopFadeTimeout) clearTimeout(cue.stopFadeTimeout);
    if (cue.endTimeout) clearTimeout(cue.endTimeout);

    if (cue.howl.playing()) cue.howl.stop();

    activeCues.delete(uuid);

    if (opts.fromEnd) {
      handleEndBehavior(uuid);
    }
  };
}

describe('finalizeCue idempotence', () => {
  let activeCues: Map<string, StubCue>;
  let handleEndBehavior: ReturnType<typeof vi.fn>;
  let finalizeCue: ReturnType<typeof createStubFinalizeCue>;

  beforeEach(() => {
    activeCues = new Map();
    handleEndBehavior = vi.fn();
    finalizeCue = createStubFinalizeCue(activeCues, handleEndBehavior);
  });

  it('calls handleEndBehavior exactly once when invoked twice', () => {
    const cue: StubCue = {
      uuid: 'test-1',
      howl: { playing: () => false, stop: vi.fn() },
    };
    activeCues.set('test-1', cue);

    finalizeCue('test-1', { fromEnd: true });
    finalizeCue('test-1', { fromEnd: true });

    expect(handleEndBehavior).toHaveBeenCalledTimes(1);
    expect(handleEndBehavior).toHaveBeenCalledWith('test-1');
  });

  it('second call is a no-op (cue already removed)', () => {
    const stopFn = vi.fn();
    const cue: StubCue = {
      uuid: 'test-2',
      howl: { playing: () => true, stop: stopFn },
    };
    activeCues.set('test-2', cue);

    finalizeCue('test-2', { fromEnd: true });
    expect(stopFn).toHaveBeenCalledTimes(1);
    expect(activeCues.size).toBe(0);

    finalizeCue('test-2', { fromEnd: true });
    expect(stopFn).toHaveBeenCalledTimes(1); // not called again
  });

  it('does not call handleEndBehavior when fromEnd is false', () => {
    const cue: StubCue = {
      uuid: 'test-3',
      howl: { playing: () => false, stop: vi.fn() },
    };
    activeCues.set('test-3', cue);

    finalizeCue('test-3', { fromEnd: false });

    expect(handleEndBehavior).not.toHaveBeenCalled();
    expect(activeCues.size).toBe(0);
  });
});

describe('cue lifecycle with fake Howl', () => {
  it('scheduled end-timeout triggers finalizeCue', async () => {
    const activeCues = new Map<string, StubCue>();
    const handleEndBehavior = vi.fn();
    const finalizeCue = createStubFinalizeCue(activeCues, handleEndBehavior);

    const cue: StubCue = {
      uuid: 'lifecycle-1',
      howl: { playing: () => true, stop: vi.fn() },
    };
    activeCues.set('lifecycle-1', cue);

    // Simulate scheduling an end timeout at 100ms
    cue.endTimeout = setTimeout(() => {
      finalizeCue('lifecycle-1', { fromEnd: true });
    }, 100);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(activeCues.size).toBe(0);
    expect(handleEndBehavior).toHaveBeenCalledTimes(1);
  });

  it('cancelling timeout before fire prevents finalizeCue', async () => {
    const activeCues = new Map<string, StubCue>();
    const handleEndBehavior = vi.fn();
    const finalizeCue = createStubFinalizeCue(activeCues, handleEndBehavior);

    const cue: StubCue = {
      uuid: 'lifecycle-2',
      howl: { playing: () => true, stop: vi.fn() },
    };
    activeCues.set('lifecycle-2', cue);

    cue.endTimeout = setTimeout(() => {
      finalizeCue('lifecycle-2', { fromEnd: true });
    }, 100);

    // Cancel before it fires (simulates stopCue)
    clearTimeout(cue.endTimeout);
    activeCues.delete('lifecycle-2');

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(handleEndBehavior).not.toHaveBeenCalled();
  });

  it('pause cancels timeout, resume re-arms it', async () => {
    const activeCues = new Map<string, StubCue>();
    const handleEndBehavior = vi.fn();
    const finalizeCue = createStubFinalizeCue(activeCues, handleEndBehavior);

    const cue: StubCue = {
      uuid: 'lifecycle-3',
      howl: { playing: () => true, stop: vi.fn() },
    };
    activeCues.set('lifecycle-3', cue);

    // Schedule end at 200ms
    cue.endTimeout = setTimeout(() => {
      finalizeCue('lifecycle-3', { fromEnd: true });
    }, 200);

    // "Pause" at 50ms — cancel timeout
    await new Promise(resolve => setTimeout(resolve, 50));
    clearTimeout(cue.endTimeout);

    // Wait 300ms (original would have fired)
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(handleEndBehavior).not.toHaveBeenCalled();
    expect(activeCues.size).toBe(1);

    // "Resume" — re-arm with remaining time (~150ms)
    cue.endTimeout = setTimeout(() => {
      finalizeCue('lifecycle-3', { fromEnd: true });
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(handleEndBehavior).toHaveBeenCalledTimes(1);
    expect(activeCues.size).toBe(0);
  });
});
