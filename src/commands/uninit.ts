import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export async function runUninit(targetPath: string): Promise<void> {
  const absPath = path.resolve(targetPath);
  console.log(chalk.cyan(`Removing CKG from ${absPath}…`));

  const codegraphDir = path.join(absPath, '.codegraph');
  if (fs.existsSync(codegraphDir)) {
    fs.rmSync(codegraphDir, { recursive: true, force: true });
    console.log(chalk.green('  ✓ Removed .codegraph/'));
  } else {
    console.log(chalk.dim('  .codegraph/ not found — skipped'));
  }

  console.log(chalk.bold.green(`✓ CKG removed from ${absPath}`));
  console.log(chalk.dim('  CLAUDE.md files were left in place. Remove them manually if desired.'));
}
