import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function getCkgDir(): string {
  return process.env.CKG_CONFIG_DIR ?? path.join(process.env.HOME!, '.ckg');
}

export function getClaudeDir(): string {
  return path.join(process.env.HOME!, '.claude');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in result &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function commandExists(cmd: string): boolean {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function runCommand(cmd: string, opts?: { silent?: boolean }): string {
  try {
    return execSync(cmd, {
      stdio: opts?.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    });
  } catch (err) {
    throw new Error(`Command failed: ${cmd}\n${(err as Error).message}`);
  }
}

export function copyFile(src: string, dest: string): void {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

export function appendToFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, 'utf-8');
}
