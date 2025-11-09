/**
 * Logging utility using winston
 */

import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`;
  }
  return `${timestamp} [${level}]: ${message}`;
});

/**
 * Create a logger instance
 */
export const createLogger = (level: string = "info"): winston.Logger => {
  return winston.createLogger({
    level,
    format: combine(
      errors({ stack: true }),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      logFormat,
    ),
    transports: [
      new winston.transports.Console({
        format: combine(colorize(), logFormat),
      }),
      new winston.transports.File({
        filename: "backend/logs/error.log",
        level: "error",
      }),
      new winston.transports.File({
        filename: "backend/logs/combined.log",
      }),
    ],
  });
};

/**
 * Default logger instance
 */
export const logger = createLogger(process.env.LOG_LEVEL || "info");
