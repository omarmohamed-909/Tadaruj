// Container liveness only. Use /health/ready at the load balancer as well.
try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || "8080"}/health/live`, { signal: AbortSignal.timeout(3000) });
  process.exitCode = response.ok ? 0 : 1;
} catch { process.exitCode = 1; }
