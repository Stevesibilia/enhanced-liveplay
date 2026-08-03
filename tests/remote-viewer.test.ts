import { describe, it, expect, beforeEach, vi } from 'vitest';

// The real state singleton loads outside the electron runtime (state.js guards
// its app.isPackaged access). Real state, path-guard, and mime are used
// directly — the test steers behaviour through the real state setters. The
// /media streaming branches that touch the disk are covered separately by
// path-guard.test.ts; here we exercise the routing/guard branches that never
// reach the filesystem.

import { createRequire } from 'module';

// Load both electron modules through the same CJS require so they share one
// Node module cache — otherwise an ESM `import` of state and remote-viewer's
// own `require('./state')` resolve to two different singleton instances and the
// setters below wouldn't affect what the route handlers read.
const require = createRequire(import.meta.url);
const state = require('../electron/state');
const { registerRemoteViewerRoutes, broadcastDisplayState, closeAllViewers } = require('../electron/remote-viewer');

// Minimal Express app double: records route + middleware handlers.
function makeApp() {
  const gets: Record<string, Function> = {};
  const uses: Array<{ paths: string[]; handler: Function }> = [];
  return {
    get: (p: string, h: Function) => { gets[p] = h; },
    use: (paths: string[], h: Function) => { uses.push({ paths, handler: h }); },
    gets,
    uses,
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    writes: [] as string[],
    body: undefined as unknown,
    ended: false,
    status(c: number) { this.statusCode = c; return this; },
    send(b: unknown) { this.body = b; this.ended = true; return this; },
    setHeader(k: string, v: unknown) { this.headers[k] = v; },
    writeHead(c: number, h: Record<string, unknown>) { this.statusCode = c; Object.assign(this.headers, h); return this; },
    write(s: string) { this.writes.push(s); return true; },
    end() { this.ended = true; return this; },
  };
}

function makeReq(query: Record<string, unknown> = {}) {
  const handlers: Record<string, Function> = {};
  return {
    query,
    on: (ev: string, cb: Function) => { handlers[ev] = cb; },
    fire: (ev: string) => handlers[ev]?.(),
  };
}

let app: ReturnType<typeof makeApp>;

beforeEach(() => {
  state.setRemoteViewerEnabled(false);
  state.setCurrentProject(null);
  state.setLastDisplayState(null);
  closeAllViewers(); // clear any client left over between tests
  app = makeApp();
  registerRemoteViewerRoutes(app as any);
});

describe('remote viewer gate', () => {
  it('404s every remote route when the viewer is disabled', () => {
    const { handler } = app.uses[0];
    const res = makeRes();
    const next = vi.fn();
    handler(makeReq(), res, next);
    expect(res.statusCode).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through when the viewer is enabled', () => {
    state.setRemoteViewerEnabled(true);
    const { handler } = app.uses[0];
    const res = makeRes();
    const next = vi.fn();
    handler(makeReq(), res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('/events SSE stream', () => {
  it('opens the stream and replays the buffered display state on connect', () => {
    state.setLastDisplayState({ layers: [{ id: 'a' }] });
    const res = makeRes();
    app.gets['/events'](makeReq(), res);

    expect(res.headers['Content-Type']).toBe('text/event-stream');
    const joined = res.writes.join('');
    expect(joined).toContain('event: display-state');
    expect(joined).toContain('"id":"a"');
  });

  it('broadcasts subsequent display states to connected clients', () => {
    const res = makeRes();
    app.gets['/events'](makeReq(), res);
    const before = res.writes.length;

    broadcastDisplayState({ layers: [{ id: 'b' }] });
    const joined = res.writes.slice(before).join('');
    expect(joined).toContain('event: display-state');
    expect(joined).toContain('"id":"b"');
  });

  it('drops clients and stops broadcasting after closeAllViewers', () => {
    const res = makeRes();
    app.gets['/events'](makeReq(), res);
    closeAllViewers();
    expect(res.ended).toBe(true);

    const before = res.writes.length;
    broadcastDisplayState({ layers: [] });
    expect(res.writes.length).toBe(before); // no longer receiving
  });

  it('removes a client when its request closes', () => {
    const res = makeRes();
    const req = makeReq();
    app.gets['/events'](req, res);
    req.fire('close');

    const before = res.writes.length;
    broadcastDisplayState({ layers: [] });
    expect(res.writes.length).toBe(before);
  });
});

describe('/media file streaming guard', () => {
  it('400s when no path is given', () => {
    const res = makeRes();
    app.gets['/media'](makeReq({}), res);
    expect(res.statusCode).toBe(400);
  });

  it('404s when no project is loaded', () => {
    state.setCurrentProject(null);
    const res = makeRes();
    app.gets['/media'](makeReq({ path: '/p/media/x.jpg' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('403s a path outside the project folder', () => {
    state.setCurrentProject('/p/show.liveplay');
    const res = makeRes();
    app.gets['/media'](makeReq({ path: '/etc/passwd' }), res);
    expect(res.statusCode).toBe(403);
  });
});
