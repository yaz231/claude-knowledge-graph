import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', 'dist', 'build', '.next', 'venv', '.temp', 'worktrees']);

function countClaudeMds(dir: string): { total: number; covered: number } {
  let total = 0;
  let covered = 0;

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    const dirs = entries.filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name));
    const files = entries.filter(e => e.isFile() && e.name !== 'CLAUDE.md');

    if (files.length > 0) {
      total++;
      if (entries.some(e => e.isFile() && e.name === 'CLAUDE.md')) {
        covered++;
      }
    }

    for (const d of dirs) {
      walk(path.join(current, d.name));
    }
  }

  walk(dir);
  return { total, covered };
}

export async function runStatus(targetPath: string): Promise<void> {
  const absPath = path.resolve(targetPath);
  console.log(chalk.bold(`CKG Status — ${absPath}`));
  console.log('');

  // CodeGraph status
  const codegraphDir = path.join(absPath, '.codegraph');
  if (fs.existsSync(codegraphDir)) {
    console.log(chalk.green('  ✓ CodeGraph: initialized (.codegraph/ present)'));
    try {
      const out = execSync('codegraph status', { cwd: absPath, encoding: 'utf-8', stdio: 'pipe' });
      console.log(chalk.dim(out.trim().split('\n').map(l => '    ' + l).join('\n')));
    } catch {
      // codegraph status may not exist — silently skip
    }
  } else {
    console.log(chalk.yellow('  ✗ CodeGraph: not initialized (run ckg init)'));
  }

  // CLAUDE.md coverage
  const { total, covered } = countClaudeMds(absPath);
  const pct = total === 0 ? 100 : Math.round((covered / total) * 100);
  const coverageColor = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
  console.log(`  ${coverageColor(`✓ CLAUDE.md coverage: ${covered}/${total} directories (${pct}%)`)}`);

  // Root CLAUDE.md
  const rootMd = path.join(absPath, 'CLAUDE.md');
  if (fs.existsSync(rootMd)) {
    const stat = fs.statSync(rootMd);
    console.log(chalk.green(`  ✓ Root CLAUDE.md: ${(stat.size / 1024).toFixed(1)} KB`));
  } else {
    console.log(chalk.yellow('  ✗ Root CLAUDE.md: missing'));
  }

  console.log('');
}
