/**
 * This file is imported FIRST before any other module.
 * Monkey-patches process.stdout/stderr.write to silence EPIPE.
 *
 * Electron's Chromium kills Node.js stdio pipes during startup.
 * Any console.log from a singleton constructor crashes with EPIPE.
 * This guard catches all such writes silently.
 */

const stdoutWrite = process.stdout.write
const stderrWrite = process.stderr.write

process.stdout.write = function () {
  try {
    return stdoutWrite.apply(process.stdout, arguments as any)
  } catch {
    return true
  }
} as any

process.stderr.write = function () {
  try {
    return stderrWrite.apply(process.stderr, arguments as any)
  } catch {
    return true
  }
} as any
