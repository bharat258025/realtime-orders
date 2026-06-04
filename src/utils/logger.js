const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m",    // cyan
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
  success: "\x1b[32m", // green
  dim: "\x1b[2m",
};

const timestamp = () => new Date().toISOString();

const logger = {
  info: (msg) =>
    console.log(`${colors.info}[INFO]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),

  warn: (msg) =>
    console.warn(`${colors.warn}[WARN]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),

  error: (msg) =>
    console.error(`${colors.error}[ERROR]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),

  success: (msg) =>
    console.log(`${colors.success}[OK]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),

  change: (msg) =>
    console.log(`${colors.warn}[CHANGE]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),

  socket: (msg) =>
    console.log(`${colors.success}[SOCKET]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${msg}`),
};

module.exports = logger;
