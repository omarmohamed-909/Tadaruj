// Callers pass operational fields only: never bodies, tokens, URLs, or credentials.
export function createLogger(write = (line) => console.log(line)) {
  return (level, event, fields = {}) => write(JSON.stringify({
    timestamp: new Date().toISOString(), level, event, ...fields,
  }));
}

export const logger = createLogger();
