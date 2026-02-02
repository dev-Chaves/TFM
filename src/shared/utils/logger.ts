import pino from "pino";

/**
 * Logger configuration for the TFM application
 * Uses pino-pretty for development and JSON for production
 */
const isDevelopment = process.env.NODE_ENV !== "production";

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: isDevelopment ? {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        }
    } : undefined,
    base: {
        env: process.env.NODE_ENV || "development",
    },
});

/**
 * Creates a child logger with a specific module context
 */
export function createLogger(module: string) {
    return logger.child({ module });
}

export default logger;
