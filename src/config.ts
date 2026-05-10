import path from 'path';
import { getCkgDir, readJsonFile, writeJsonFile } from './utils.js';

export interface CkgConfig {
  anthropic_api_key: string;
  python_path: string;
  hook_model: string;
  init_model: string;
}

const DEFAULTS: CkgConfig = {
  anthropic_api_key: '',
  python_path: 'python3',
  hook_model: 'claude-haiku-4-5-20251001',
  init_model: 'claude-sonnet-4-6',
};

export function getConfigPath(): string {
  return path.join(getCkgDir(), 'config.json');
}

export function readConfig(): CkgConfig {
  return { ...DEFAULTS, ...readJsonFile<Partial<CkgConfig>>(getConfigPath(), {}) };
}

export function writeConfig(config: Partial<CkgConfig>): void {
  const existing = readConfig();
  writeJsonFile(getConfigPath(), { ...existing, ...config });
}
