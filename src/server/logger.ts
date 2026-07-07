import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [
    'req.headers["x-gemini-key"]',
    'req.headers["x-openrouter-key"]',
    'req.headers["x-deepinfra-key"]',
    'req.headers.authorization'
  ],
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
