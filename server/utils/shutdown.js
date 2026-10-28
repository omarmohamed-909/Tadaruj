export function createShutdownHandler({ server, disconnect, beginDrain, logger, exit = (code) => process.exit(code), timeoutMs = 10000 }) {
  let closing = false;
  return (signal) => {
    if (closing) return;
    closing = true;
    beginDrain();
    logger("info", "server.draining", { signal });
    const deadline = setTimeout(() => {
      logger("error", "server.shutdown_timeout");
      server.closeAllConnections?.();
      exit(1);
    }, timeoutMs);
    deadline.unref?.();
    server.close(async (error) => {
      try {
        if (error) throw error;
        await disconnect();
        clearTimeout(deadline);
        logger("info", "server.stopped");
        exit(0);
      } catch {
        clearTimeout(deadline);
        logger("error", "server.shutdown_failed");
        exit(1);
      }
    });
    server.closeIdleConnections?.();
  };
}
