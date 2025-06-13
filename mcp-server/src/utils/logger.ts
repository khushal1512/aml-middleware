import { settings } from "../config/settings.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: number;

  constructor() {
    this.minLevel = LEVEL_PRIORITY[settings.logLevel] ?? 1;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= this.minLevel;
  }

  private format(level: LogLevel, module: string, message: string): string {
    const ts = new Date().toISOString();
    return `[${ts}] [${level.toUpperCase().padEnd(5)}] [${module}] ${message}`;
  }

  debug(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog("debug")) return;
    const formatted = this.format("debug", module, message);
    if (data !== undefined) {
      console.error(formatted, JSON.stringify(data));
    } else {
      console.error(formatted);
    }
  }

  info(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog("info")) return;
    const formatted = this.format("info", module, message);
    if (data !== undefined) {
      console.error(formatted, JSON.stringify(data));
    } else {
      console.error(formatted);
    }
  }

  warn(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog("warn")) return;
    const formatted = this.format("warn", module, message);
    if (data !== undefined) {
      console.error(formatted, JSON.stringify(data));
    } else {
      console.error(formatted);
    }
  }

  error(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog("error")) return;
    const formatted = this.format("error", module, message);
    if (data !== undefined) {
      console.error(formatted, JSON.stringify(data));
    } else {
      console.error(formatted);
    }
  }
}

export const logger = new Logger();