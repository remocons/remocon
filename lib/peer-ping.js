// Shared protocol convention: one TEXT argument (sender CID), no JSON parsing.
export function createPingSession(io, { onPong, onTimeout, timeoutMs = 3000, pongCode = 0xCE }) {
  const pending = new Map();
  let hasPongEvent = false;
  let disposed = false;
  let socket;
  const controlPong = () => pong();
  function detachSocket() { socket?.off?.('pong', controlPong); socket = undefined; }
  function attachSocket() {
    detachSocket();
    if (typeof io.socket?.on === 'function') { socket = io.socket; socket.on('pong', controlPong); }
  }
  function disconnected() { clear(); detachSocket(); }
  const validCid = cid => typeof cid === 'string' && /^[^\s@,#\x00-\x1f\x7f]{1,12}$/.test(cid);
  function cancel(target) { clearTimeout(pending.get(target)); pending.delete(target); }
  function clear() { for (const target of pending.keys()) cancel(target); }
  function pong(target = '') {
    if (disposed) return;
    cancel(target);
    onPong(target);
  }
  const handlers = {
    pong: () => { hasPongEvent = true; pong(); },
    // iosignal 7.0.4 discards protocol PONG without emitting an event.
    // The core's socket_data listener runs first; newer cores emit pong there.
    socket_data: packet => { if (!hasPongEvent && packet?.length === 1 && packet[0] === pongCode) pong(); },
    '@': (tag, ...args) => {
      if (args.length !== 1 || !validCid(args[0])) return;
      if (tag === '@ping' && io.stateName === 'ready') io.signal(`${args[0]}@pong`, io.cid);
      else if (tag === '@pong') pong(args[0]);
    },
    ready: attachSocket,
    close: disconnected,
    closed: disconnected,
    stop: disconnected
  };
  Object.entries(handlers).forEach(([event, handler]) => io.on(event, handler));
  if (io.stateName === 'ready') attachSocket();
  return {
    clear,
    ping(target = '') {
      if (disposed) return;
      if (io.stateName !== 'ready') throw new Error('Server connection is not ready.');
      if (target && !validCid(target)) throw new Error('Usage: ping [cid] (CID must be 1..12 characters without routing delimiters).');
      if (pending.has(target)) throw new Error(`Already waiting for pong${target ? ` (${target})` : ''}.`);
      pending.set(target, setTimeout(() => { pending.delete(target); if (!disposed) onTimeout(target); }, timeoutMs));
      try { if (target) io.signal(`${target}@ping`, io.cid); else io.ping(); }
      catch (error) { cancel(target); throw error; }
    },
    dispose() { disposed = true; clear(); detachSocket(); Object.entries(handlers).forEach(([event, handler]) => io.off(event, handler)); }
  };
}
