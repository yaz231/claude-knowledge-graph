import path from 'path';
import { execSync } from 'child_process';
import { getCkgDir, readJsonFile, writeJsonFile } from './utils.js';

export interface CkgConfig {
  anthropic_api_key?: string;
  python_path: string;
  hook_model: string;
  init_model: string;
}

const DEFAULTS: CkgConfig = {
  python_path: 'python3',
  hook_model: 'claude-haiku-4-5-20251001',
  init_model: 'claude-sonnet-4-6',
};

const KEYCHAIN_SERVICE = 'claude-knowledge-graph';

export function getConfigPath(): string {
  return path.join(getCkgDir(), 'config.json');
}

export function readConfig(): CkgConfig {
  return { ...DEFAULTS, ...readJsonFile<Partial<CkgConfig>>(getConfigPath(), {}) };
}

export function writeConfig(config: Partial<CkgConfig>): void {
  const existing = readConfig();
  // Never persist anthropic_api_key — it lives in Keychain
  const { anthropic_api_key: _, ...safeConfig } = { ...existing, ...config };
  writeJsonFile(getConfigPath(), safeConfig);
}

export function storeApiKeyInKeychain(apiKey: string): void {
  const user = process.env.USER ?? process.env.USERNAME ?? '';
  execSync(
    `security add-generic-password -a "${user}" -s "${KEYCHAIN_SERVICE}" -w "${apiKey}" -U`,
    { stdio: 'ignore' }
  );
}

export function getApiKey(): string | null {
  // 1. macOS Keychain
  try {
    const user = process.env.USER ?? process.env.USERNAME ?? '';
    const key = execSync(
      `security find-generic-password -a "${user}" -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (key) return key;
  } catch {
    // security CLI not available or key not found — fall through
  }

  // 2. Environment variable
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  // 3. Legacy config file fallback
  const config = readConfig();
  if (config.anthropic_api_key) return config.anthropic_api_key;

  return null;
}
