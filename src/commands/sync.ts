import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readConfig } from '../config.js';
import { getCkgDir } from '../utils.js';

export async function runSync(targetPath: string): Promise<void> {
  const absPath = path.resolve(targetPath);
  const config = readConfig();
  console.log(chalk.cyan(`Syncing CKG in ${absPath}…`));

  // Re-index codegraph
  try {
    console.log(chalk.dim('  Re-indexing CodeGraph…'));
    execSync(`codegraph index "${absPath}"`, { stdio: 'inherit' });
    console.log(chalk.green('  ✓ CodeGraph re-indexed'));
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ codegraph index failed: ${(err as Error).message}`));
  }

  // Regenerate stale CLAUDE.md files
  const scriptPath = `${getCkgDir()}/scripts/init_claude_md.py`;
  try {
    console.log(chalk.dim('  Regenerating CLAUDE.md files…'));
    execSync(`${config.python_path} "${scriptPath}" --path "${absPath}"`, { stdio: 'inherit' });
    console.log(chalk.green('  ✓ CLAUDE.md files updated'));
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ CLAUDE.md regeneration failed: ${(err as Error).message}`));
  }

  console.log(chalk.bold.green(`✓ CKG sync complete`));
}
