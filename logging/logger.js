const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const logDir = path.join(__dirname, '../logs');
const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    // Error log file with daily rotation
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error', // Only log error-level messages
      maxSize: '20m', // Maximum size per file
      maxFiles: '14d', // Retain logs for 14 days
    }),

    // Info log file with daily rotation
    new DailyRotateFile({
      filename: `${logDir}/info-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'info', // Only log info-level and below messages
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // Console log (for debugging)
    new transports.Console(),
  ],
});

module.exports = logger;
