import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readConfig } from '../config.js';
import { getCkgDir } from '../utils.js';

export async function runInit(targetPath: string, pythonPathOverride?: string): Promise<void> {
  const absPath = path.resolve(targetPath);
  const config = readConfig();
  const pythonPath = pythonPathOverride ?? config.python_path;

  console.log(chalk.cyan(`Initializing CKG in ${absPath}…`));

  // Step 1: codegraph init
  try {
    console.log(chalk.dim('  Running codegraph init…'));
    execSync(`codegraph init -i "${absPath}"`, { stdio: 'inherit' });
    console.log(chalk.green('  ✓ CodeGraph indexed'));
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ codegraph init failed: ${(err as Error).message}`));
    console.log(chalk.dim('  Install CodeGraph globally: npm install -g @colbymchenry/codegraph'));
  }

  // Step 2: CLAUDE.md crawl
  const scriptPath = `${getCkgDir()}/scripts/init_claude_md.py`;
  try {
    console.log(chalk.dim('  Generating CLAUDE.md files…'));
    execSync(`${pythonPath} "${scriptPath}" --path "${absPath}"`, { stdio: 'inherit' });
    console.log(chalk.green('  ✓ CLAUDE.md files generated'));
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ CLAUDE.md generation failed: ${(err as Error).message}`));
  }

  console.log(chalk.bold.green(`✓ CKG initialized in ${absPath}`));
}
