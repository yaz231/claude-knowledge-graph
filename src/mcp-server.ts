#!/usr/bin/env node
/**
 * MCP server entry point.
 * CKG delegates symbol intelligence to the codegraph MCP server (configured in ~/.claude.json).
 * This file is a placeholder for future CKG-native MCP tools (e.g., CLAUDE.md search).
 */

import { readConfig } from './config.js';

async function main(): Promise<void> {
  const config = readConfig();
  if (!config.anthropic_api_key) {
    console.error('CKG not configured. Run `ckg install` first.');
    process.exit(1);
  }

  // Future: expose CLAUDE.md search as an MCP tool.
  // For now, codegraph handles symbol intelligence via its own MCP server.
  console.error('CKG MCP server: no native tools registered yet. CodeGraph MCP handles symbol lookup.');
  process.exit(0);
}

main();
