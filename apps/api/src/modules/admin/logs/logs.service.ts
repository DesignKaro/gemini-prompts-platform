import { Injectable, NotFoundException } from '@nestjs/common';
import { readdir, stat, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ErrorLogLevelFilter } from './dto/list-error-logs-query.dto';

type LogFileEntry = {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
};

type ParsedLogLevel = 'error' | 'warn' | 'info' | 'unknown';

type ParsedLogEntry = {
  timestamp: string | null;
  level: ParsedLogLevel;
  message: string;
  raw: string;
};

const DEFAULT_LIMIT = 150;
const MAX_TAIL_BYTES = 2 * 1024 * 1024;
const LOG_FILE_EXTENSION_PATTERN = /\.(log|txt|jsonl)$/i;
const LOG_FILE_NAME_PATTERN = /(log|error|exception|trace|stderr|stdout)/i;

function sanitizePathValue(value: string) {
  return value.replace(/[<>]/g, '').trim();
}

function toFileId(filePath: string) {
  return Buffer.from(filePath, 'utf8').toString('base64url');
}

function normalizeLevel(value: unknown): ParsedLogLevel {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'unknown';
  if (
    normalized.includes('error') ||
    normalized.includes('fatal') ||
    normalized === 'err' ||
    normalized === 'stderr'
  ) {
    return 'error';
  }
  if (normalized.includes('warn')) {
    return 'warn';
  }
  if (normalized.includes('info') || normalized.includes('debug') || normalized.includes('log')) {
    return 'info';
  }
  return 'unknown';
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function extractIsoTimestamp(line: string): string | null {
  const match = line.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?/,
  );
  if (!match) return null;
  const parsed = new Date(match[0]);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseLogLine(rawLine: string): ParsedLogEntry {
  const line = rawLine.trim();
  if (!line) {
    return {
      timestamp: null,
      level: 'unknown',
      message: '',
      raw: rawLine,
    };
  }

  if (line.startsWith('{') && line.endsWith('}')) {
    try {
      const payload = JSON.parse(line) as Record<string, unknown>;
      const messageCandidate =
        payload.message ??
        payload.msg ??
        payload.error ??
        payload.reason ??
        payload.stack ??
        payload.details;
      const message =
        typeof messageCandidate === 'string'
          ? messageCandidate
          : JSON.stringify(messageCandidate ?? payload);
      return {
        timestamp:
          normalizeTimestamp(payload.timestamp ?? payload.ts ?? payload.time ?? payload.createdAt) ??
          extractIsoTimestamp(line),
        level: normalizeLevel(payload.level ?? payload.severity ?? payload.logLevel),
        message: message.slice(0, 4000),
        raw: rawLine,
      };
    } catch {
      // Fallback to plain text parser.
    }
  }

  const level = normalizeLevel(line);
  return {
    timestamp: extractIsoTimestamp(line),
    level,
    message: line.slice(0, 4000),
    raw: rawLine,
  };
}

function shouldIncludeLevel(level: ParsedLogLevel, filter: ErrorLogLevelFilter) {
  if (filter === ErrorLogLevelFilter.ALL) {
    return true;
  }
  if (filter === ErrorLogLevelFilter.WARN) {
    return level === 'warn' || level === 'error';
  }
  return level === 'error';
}

async function pathExistsAsFile(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function pathExistsAsDirectory(directoryPath: string) {
  try {
    const directoryStat = await stat(directoryPath);
    return directoryStat.isDirectory();
  } catch {
    return false;
  }
}

@Injectable()
export class LogsService {
  private readonly workspaceRoot = this.resolveWorkspaceRoot();

  private resolveWorkspaceRoot() {
    const cwd = process.cwd();
    const candidates = [cwd, path.resolve(cwd, '..'), path.resolve(cwd, '../..')];
    for (const candidate of candidates) {
      const hasApiApp = existsSync(path.join(candidate, 'apps', 'api'));
      const hasWebApp = existsSync(path.join(candidate, 'apps', 'web'));
      if (hasApiApp && hasWebApp) {
        return candidate;
      }
    }
    return cwd;
  }

  private listExplicitLogCandidates() {
    const fromEnv = (process.env.DASHBOARD_LOG_FILES ?? '')
      .split(',')
      .map((entry) => sanitizePathValue(entry))
      .filter(Boolean);
    const explicitPaths = [
      process.env.RUM_LOG_FILE_PATH,
      '/tmp/gemini-prompts-rum.jsonl',
      ...fromEnv,
    ]
      .map((entry) => sanitizePathValue(String(entry ?? '')))
      .filter(Boolean)
      .map((entry) => (path.isAbsolute(entry) ? entry : path.resolve(this.workspaceRoot, entry)));
    return Array.from(new Set(explicitPaths));
  }

  private listLogDirectories() {
    const directories = [
      path.resolve(this.workspaceRoot, 'logs'),
      path.resolve(this.workspaceRoot, 'apps/api/logs'),
      path.resolve(this.workspaceRoot, 'apps/web/logs'),
      path.resolve(this.workspaceRoot, '.npm-cache/_logs'),
    ];
    return Array.from(new Set(directories));
  }

  private async listFilesFromDirectory(directoryPath: string) {
    if (!(await pathExistsAsDirectory(directoryPath))) {
      return [];
    }

    const entries = await readdir(directoryPath, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const candidatePath = path.join(directoryPath, entry.name);
      if (LOG_FILE_EXTENSION_PATTERN.test(entry.name) || LOG_FILE_NAME_PATTERN.test(entry.name)) {
        files.push(candidatePath);
      }
    }
    return files;
  }

  private async collectLogFiles() {
    const candidates = new Set<string>();
    for (const explicitPath of this.listExplicitLogCandidates()) {
      candidates.add(explicitPath);
    }
    for (const directoryPath of this.listLogDirectories()) {
      const files = await this.listFilesFromDirectory(directoryPath);
      for (const filePath of files) {
        candidates.add(filePath);
      }
    }

    const files: LogFileEntry[] = [];
    for (const filePath of candidates) {
      if (!(await pathExistsAsFile(filePath))) {
        continue;
      }
      const fileStat = await stat(filePath);
      files.push({
        id: toFileId(filePath),
        name: path.basename(filePath),
        path: filePath,
        sizeBytes: fileStat.size,
        updatedAt: fileStat.mtime.toISOString(),
      });
    }

    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return files;
  }

  private async readTail(filePath: string, maxBytes: number) {
    const fileStat = await stat(filePath);
    if (fileStat.size <= 0) {
      return { text: '', truncatedFromStart: false };
    }
    const bytesToRead = Math.min(fileStat.size, maxBytes);
    const start = Math.max(0, fileStat.size - bytesToRead);
    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(bytesToRead);
      await handle.read(buffer, 0, bytesToRead, start);
      return {
        text: buffer.toString('utf8'),
        truncatedFromStart: start > 0,
      };
    } finally {
      await handle.close();
    }
  }

  async listErrorLogs(options: {
    fileId?: string;
    search?: string;
    limit?: number;
    level?: ErrorLogLevelFilter;
  }) {
    const files = await this.collectLogFiles();
    const selected =
      (options.fileId ? files.find((file) => file.id === options.fileId) : files[0]) ?? null;
    if (options.fileId && !selected) {
      throw new NotFoundException('Requested log file was not found.');
    }

    const filterLevel = options.level ?? ErrorLogLevelFilter.ERROR;
    const filterSearch = options.search?.trim().toLowerCase() ?? '';
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 500);

    if (!selected) {
      return {
        files,
        selectedFile: null,
        filters: {
          level: filterLevel,
          search: options.search ?? '',
          limit,
        },
        entries: [],
        truncatedFromStart: false,
        scannedLineCount: 0,
      };
    }

    const tail = await this.readTail(selected.path, MAX_TAIL_BYTES);
    const lines = tail.text.split(/\r?\n/);
    if (tail.truncatedFromStart && lines.length > 0) {
      lines.shift();
    }

    const entries: ParsedLogEntry[] = [];
    for (let index = lines.length - 1; index >= 0 && entries.length < limit; index -= 1) {
      const raw = lines[index];
      if (!raw || !raw.trim()) continue;
      const parsed = parseLogLine(raw);
      if (!shouldIncludeLevel(parsed.level, filterLevel)) continue;
      if (filterSearch) {
        const haystack = `${parsed.message}\n${parsed.raw}`.toLowerCase();
        if (!haystack.includes(filterSearch)) continue;
      }
      entries.push(parsed);
    }

    return {
      files,
      selectedFile: selected,
      filters: {
        level: filterLevel,
        search: options.search ?? '',
        limit,
      },
      entries,
      truncatedFromStart: tail.truncatedFromStart,
      scannedLineCount: lines.length,
    };
  }
}
