import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'access_token',
      '*.access_token',
      '*.*.access_token',
      'authorization',
      'headers.authorization',
      'token',
      'token_ciphertext',
      'password',
      'cookie',
      'headers.cookie',
      'secret',
    ],
    censor: '[REDACTED]',
  },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
