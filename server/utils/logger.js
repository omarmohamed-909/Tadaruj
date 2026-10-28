import { AsyncLocalStorage } from "node:async_hooks";

const requestContext = new AsyncLocalStorage();
const errorTypes = new Set(["Error", "TypeError", "SyntaxError", "ValidationError", "CastError", "MongoServerError", "MulterError", "TokenExpiredError", "JsonWebTokenError"]);
const errorCodes = new Set(["EMAIL_DELIVERY_FAILED", "LIMIT_FILE_SIZE", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", 11000]);

// Callers pass operational fields only: never bodies, tokens, URLs, or credentials.
export function createLogger(write = (line) => console.log(line)) {
  return (level, event, fields = {}) => write(JSON.stringify({
    timestamp: new Date().toISOString(), level, event, ...fields,
  }));
}

export const logger = createLogger();

export const withRequestLogging = (context, callback) => requestContext.run(context, callback);

// Errors can contain passwords, tokens, provider payloads and user-supplied input,
// even in their name/code/stack. Only emit known classifications, never serialize them.
export function reportError(event, error, level = "error") {
  const name = error?.name;
  const code = error?.code;
  const context = requestContext.getStore();
  const fields = {
    ...(context?.requestId ? { requestId: context.requestId } : {}),
    ...(error == null ? {} : { errorType: errorTypes.has(name) ? name : "Error" }),
    ...(errorCodes.has(code) ? { errorCode: code } : {}),
  };
  (context?.logger || logger)(level === "warn" ? "warn" : "error", event, fields);
}
