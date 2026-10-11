/**
 * Minimal structured-ish logger. Cloud Run/Cloud Logging parses JSON lines
 * on stdout/stderr automatically, so we keep this dependency-free rather
 * than pulling in a logging library for a small service.
 */
export function createLogger(component: string) {
  const emit = (level: 'info' | 'warn' | 'error', message: string, meta?: object) => {
    const line = JSON.stringify({ severity: level.toUpperCase(), component, message, ...meta });
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
  };
  return {
    info: (message: string, meta?: object) => emit('info', message, meta),
    warn: (message: string, meta?: object) => emit('warn', message, meta),
    error: (message: string, meta?: object) => emit('error', message, meta),
  };
}
