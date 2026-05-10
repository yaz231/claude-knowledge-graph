import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getCkgDir, getClaudeDir, ensureDir, deepMerge, readJsonFile, writeJsonFile, commandExists, copyFile, appendToFile } from './utils.js';
import { writeConfig, storeApiKeyInKeychain } from './config.js';

// inquirer is ESM-only; we import it dynamically
async function getInquirer() {
  const { default: inquirer } = await import('inquirer');
  return inquirer;
}

function packageDir(): string {
  return path.resolve(__dirname, '..');
}

export async function runInstaller(): Promise<void> {
  const inquirer = await getInquirer();

  console.log('\n' + chalk.bold.cyan('Claude Knowledge Graph'));
  console.log(chalk.dim('Combining semantic code intelligence with persistent project memory'));
  console.log('');

  // Step 2 — check codegraph
  const hasCodegraph = commandExists('codegraph');
  if (!hasCodegraph) {
    const { installCg } = await inquirer.prompt<{ installCg: boolean }>([
      {
        type: 'confirm',
        name: 'installCg',
        message: 'CodeGraph is required. Install it globally now? (npm install -g @colbymchenry/codegraph)',
        default: true,
      },
    ]);
    if (installCg) {
      console.log(chalk.dim('Installing CodeGraph globally…'));
      execSync('npm install -g @colbymchenry/codegraph', { stdio: 'inherit' });
      console.log(chalk.green('✓ CodeGraph installed'));
    } else {
      console.log(chalk.yellow('⚠ CodeGraph not installed. Some features will not work.'));
    }
  } else {
    console.log(chalk.green('✓ CodeGraph already installed'));
  }

  // Step 3-6 — config prompts
  const answers = await inquirer.prompt<{
    anthropic_api_key: string;
    python_path: string;
    hook_model: string;
    init_model: string;
  }>([
    {
      type: 'password',
      name: 'anthropic_api_key',
      message: 'Enter your Anthropic API key:',
      mask: '*',
      validate: (v: string) => v.trim().length > 0 || 'API key is required',
    },
    {
      type: 'input',
      name: 'python_path',
      message: 'Enter your Python interpreter path:',
      default: 'python3',
      validate: (v: string) => {
        try {
          execSync(`${v} --version`, { stdio: 'ignore' });
          return true;
        } catch {
          return `Could not run "${v} --version". Enter a valid Python path.`;
        }
      },
    },
    {
      type: 'list',
      name: 'hook_model',
      message: 'Preferred model for hook updates (fast/cheap):',
      choices: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
      default: 'claude-haiku-4-5-20251001',
    },
    {
      type: 'list',
      name: 'init_model',
      message: 'Preferred model for initial CLAUDE.md generation (quality):',
      choices: ['claude-sonnet-4-6', 'claude-opus-4-6'],
      default: 'claude-sonnet-4-6',
    },
  ]);

  // Store API key in macOS Keychain; save everything else to config
  try {
    storeApiKeyInKeychain(answers.anthropic_api_key);
    console.log(chalk.green('✓ API key stored in macOS Keychain'));
  } catch {
    console.log(chalk.yellow('⚠ Could not store key in Keychain (non-macOS?). Set ANTHROPIC_API_KEY env var instead.'));
  }

  const { anthropic_api_key: _, ...configWithoutKey } = answers;
  writeConfig(configWithoutKey);
  console.log(chalk.green(`✓ Config saved to ${getCkgDir()}/config.json`));

  // Step 7 — copy hooks
  const hooksDestDir = path.join(getClaudeDir(), 'hooks');
  ensureDir(hooksDestDir);
  const pkgDir = packageDir();
  copyFile(path.join(pkgDir, 'hooks', 'post_tool_use.py'), path.join(hooksDestDir, 'post_tool_use.py'));
  copyFile(path.join(pkgDir, 'hooks', 'stop.py'), path.join(hooksDestDir, 'stop.py'));
  console.log(chalk.green('✓ Hooks copied to ~/.claude/hooks/'));

  // Step 8 — copy init script
  const scriptsDestDir = path.join(getCkgDir(), 'scripts');
  ensureDir(scriptsDestDir);
  copyFile(path.join(pkgDir, 'scripts', 'init_claude_md.py'), path.join(scriptsDestDir, 'init_claude_md.py'));
  console.log(chalk.green('✓ Scripts copied to ~/.ckg/scripts/'));

  // Step 9 — merge ~/.claude/settings.json
  const settingsPath = path.join(getClaudeDir(), 'settings.json');
  const existingSettings = readJsonFile<Record<string, unknown>>(settingsPath, {});
  const newHooks = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: `${answers.python_path} ~/.claude/hooks/post_tool_use.py`,
              async: true,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: `${answers.python_path} ~/.claude/hooks/stop.py`,
            },
          ],
        },
      ],
    },
  };
  const mergedSettings = deepMerge(existingSettings, newHooks);
  writeJsonFile(settingsPath, mergedSettings);
  console.log(chalk.green('✓ ~/.claude/settings.json updated'));

  // Step 10 — merge ~/.claude.json
  const claudeJsonPath = path.join(process.env.HOME!, '.claude.json');
  const existingClaude = readJsonFile<Record<string, unknown>>(claudeJsonPath, {});
  const newMcp = {
    mcpServers: {
      codegraph: {
        type: 'stdio',
        command: 'codegraph',
        args: ['serve', '--mcp'],
      },
    },
  };
  const mergedClaude = deepMerge(existingClaude, newMcp);
  writeJsonFile(claudeJsonPath, mergedClaude);
  console.log(chalk.green('✓ ~/.claude.json updated with codegraph MCP server'));

  // Step 11 — write ~/.claude/CLAUDE.md
  const globalClaudeMd = path.join(getClaudeDir(), 'CLAUDE.md');
  const ckgMdBlock = `
## Claude Knowledge Graph

This environment has CKG installed — combining CodeGraph symbol intelligence with persistent CLAUDE.md project memory.

### Per-project usage
When a project has .codegraph/ initialized:
- Use codegraph_search, codegraph_callers, codegraph_callees, codegraph_impact for symbol lookups
- Spawn Explore agents for broad exploration questions — never call codegraph_explore/codegraph_context in the main session
- CLAUDE.md files in each directory contain narrative context: architecture decisions, conventions, session history — read them

When starting a session on any project:
- Check if .codegraph/ exists. If not, ask: "Would you like me to run ckg init to set up Claude Knowledge Graph for this project?"
- Check for CLAUDE.md in current and parent directories and load context before starting work

### Hook behavior (invisible, automatic)
- After every file write/edit: the affected directory's CLAUDE.md is updated automatically
- After every session: a changelog summary is appended to the root CLAUDE.md
`;

  if (fs.existsSync(globalClaudeMd)) {
    const existing = fs.readFileSync(globalClaudeMd, 'utf-8');
    if (!existing.includes('## Claude Knowledge Graph')) {
      appendToFile(globalClaudeMd, ckgMdBlock);
      console.log(chalk.green('✓ CKG block appended to ~/.claude/CLAUDE.md'));
    } else {
      console.log(chalk.dim('  ~/.claude/CLAUDE.md already contains CKG block — skipped'));
    }
  } else {
    fs.writeFileSync(globalClaudeMd, ckgMdBlock.trimStart(), 'utf-8');
    console.log(chalk.green('✓ ~/.claude/CLAUDE.md created'));
  }

  // Step 12 — optionally init current directory
  const { initCurrent } = await inquirer.prompt<{ initCurrent: boolean }>([
    {
      type: 'confirm',
      name: 'initCurrent',
      message: 'Initialize CKG in the current directory?',
      default: false,
    },
  ]);

  if (initCurrent) {
    const { runInit } = await import('./commands/init.js');
    await runInit(process.cwd(), answers.python_path);
  }

  // Step 13 — success
  console.log('');
  console.log(chalk.bold.green('✓ Claude Knowledge Graph installed successfully!'));
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(`  ${chalk.cyan('ckg init [path]')}    — Initialize CKG in any project`);
  console.log(`  ${chalk.cyan('ckg status [path]')}  — Check CodeGraph + CLAUDE.md coverage`);
  console.log(`  ${chalk.cyan('ckg sync [path]')}    — Re-index and refresh CLAUDE.md files`);
  console.log('');
  console.log(chalk.dim('Restart Claude Code to activate hooks and MCP server.'));
}
