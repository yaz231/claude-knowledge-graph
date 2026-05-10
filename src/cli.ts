#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../package.json';

const program = new Command();

program
  .name('ckg')
  .description('Claude Knowledge Graph — semantic code intelligence + persistent project memory for Claude Code')
  .version(version);

// Default command — interactive installer
program
  .action(async () => {
    const { runInstaller } = await import('./installer.js');
    await runInstaller();
  });

// ckg install — alias for installer
program
  .command('install')
  .description('Run the interactive CKG installer')
  .action(async () => {
    const { runInstaller } = await import('./installer.js');
    await runInstaller();
  });

// ckg init [path]
program
  .command('init [path]')
  .description('Initialize CKG in a project (codegraph index + CLAUDE.md crawl)')
  .action(async (targetPath: string = '.') => {
    const { runInit } = await import('./commands/init.js');
    await runInit(targetPath);
  });

// ckg uninit [path]
program
  .command('uninit [path]')
  .description('Remove CKG from a project')
  .action(async (targetPath: string = '.') => {
    const { runUninit } = await import('./commands/uninit.js');
    await runUninit(targetPath);
  });

// ckg status [path]
program
  .command('status [path]')
  .description('Show codegraph status + CLAUDE.md coverage')
  .action(async (targetPath: string = '.') => {
    const { runStatus } = await import('./commands/status.js');
    await runStatus(targetPath);
  });

// ckg sync [path]
program
  .command('sync [path]')
  .description('Re-index codegraph + regenerate stale CLAUDE.md files')
  .action(async (targetPath: string = '.') => {
    const { runSync } = await import('./commands/sync.js');
    await runSync(targetPath);
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});
