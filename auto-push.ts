// @maintained 2026-09-26T06:58:24.058Z
/**
 * scripts/auto-push.ts
 *
 * Stamps random source files, regenerates README via AI,
 * generates a commit message via AI, then pushes to GitHub.
 *
 * Usage:
 *   npx tsx scripts/auto-push.ts            live run
 *   npx tsx scripts/auto-push.ts --dry-run  preview only, no writes
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import OpenAI, { AzureOpenAI } from 'openai';

// ─── Env loader ───────────────────────────────────────────────────────────────
// Loads .env.local first, then .env. Later files do not override earlier ones.
function loadEnv(...files: string[]): void {
  for (const f of files) {
    const abs = path.resolve(process.cwd(), f);
    if (!fs.existsSync(abs)) continue;
    for (const line of fs.readFileSync(abs, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      // strip surrounding quotes if present
      process.env[m[1]] = m[2].replace(/^(['"])(.*)(\1)$/, '$2');
    }
  }
}
loadEnv('.env.local', '.env');

// ─── Config ───────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');
const API_KEY = process.env.OPENAI_API_KEY ?? '';
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4';
const ENDPOINT = process.env.OPENAI_ENDPOINT ?? '';
const API_VER = process.env.OPENAI_API_VERSION ?? '';
const IS_AZURE = !!API_VER;

if (!API_KEY) {
  console.error('[auto-push] OPENAI_API_KEY is not set in .env / .env.local');
  process.exit(1);
}

// ─── File filters ─────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', '.turbo', 'out', '.vercel',
]);

const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'README.md', 'schema.sql', 'manifest.json',
  'components.json', '.gitignore', 'nodemon.json',
]);

// Only these extensions are eligible for stamping
const VALID_EXT = new Set(['.ts', '.tsx', '.css', '.mjs']);

// Resolve the script's own absolute path so it never stamps itself
const SELF = (() => {
  try { return fs.realpathSync(process.argv[1]); } catch { return ''; }
})();

// ─── Utilities ────────────────────────────────────────────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function rel(p: string): string {
  return path.relative(ROOT, p);
}

// ─── Git ──────────────────────────────────────────────────────────────────────
// Uses spawnSync (not execSync) so commit messages with special chars are safe.
function git(...args: string[]): string {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `git ${args[0]} failed`);
  }
  return r.stdout?.trim() ?? '';
}

function hasUncommittedChanges(): boolean {
  const r = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT, encoding: 'utf-8',
  });
  return (r.stdout?.trim().length ?? 0) > 0;
}

// ─── File collection ──────────────────────────────────────────────────────────
function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectFiles(full, out);
    } else if (
      VALID_EXT.has(path.extname(entry.name)) &&
      !SKIP_FILES.has(entry.name) &&
      fs.realpathSync(full) !== SELF
    ) {
      out.push(full);
    }
  }
  return out;
}

// ─── File stamping ────────────────────────────────────────────────────────────
// Adds or replaces a single @maintained timestamp comment at the top of each
// file. Guaranteed to produce a real git diff on every run.
function stampFile(filePath: string): void {
  const isCss = path.extname(filePath) === '.css';
  let text = fs.readFileSync(filePath, 'utf-8');
  const ts = new Date().toISOString();

  // Remove any existing stamp line
  if (isCss) {
    text = text.replace(/^\/\* @maintained [^\n]+\n/, '');
  } else {
    text = text.replace(/^\/\/ @maintained [^\n]+\n/, '');
  }

  const stamp = isCss
    ? `/* @maintained ${ts} */\n`
    : `// @maintained ${ts}\n`;

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, stamp + text, 'utf-8');
  }
}

// ─── AI client ────────────────────────────────────────────────────────────────
function getClient(): OpenAI {
  if (IS_AZURE) {
    return new AzureOpenAI({
      apiKey: API_KEY,
      endpoint: ENDPOINT,
      apiVersion: API_VER,
      deployment: MODEL,
    });
  }
  return new OpenAI({
    apiKey: API_KEY,
    baseURL: ENDPOINT || undefined,
  });
}

async function ask(
  system: string,
  user: string,
  maxTokens: number = 200,
): Promise<string> {
  const r = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return (r.choices[0].message.content ?? '').trim();
}

// ─── AI: commit message ───────────────────────────────────────────────────────
async function buildCommitMessage(files: string[]): Promise<string> {
  const list = files.map(rel).join('\n');
  const msg = await ask(
    'You write concise git commit messages using conventional commits format ' +
    '(feat/fix/chore/refactor/style/docs). Max 72 characters. No trailing period.',
    `Files modified this session:\n${list}\n\nWrite one realistic commit message.`,
    80,
  );
  return msg || 'chore: update source files';
}

// ─── AI: README ───────────────────────────────────────────────────────────────
async function buildReadme(modified: string[]): Promise<string> {
  const readmePath = path.join(ROOT, 'README.md');
  const current = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, 'utf-8')
    : '';

  const tree = collectFiles(ROOT).map(rel).sort().join('\n');
  const changed = modified.map(rel).join(', ');
  const today = new Date().toISOString().slice(0, 10);

  const md = await ask(
    'Write a professional README.md. Output only raw markdown content, ' +
    'no wrapping code fences around the entire response.',
    `Project: Next.js 14 AI-powered wardrobe management and outfit recommendation app.
Stack: Next.js 14, TypeScript, Supabase, OpenAI.
Features evident from the file tree: outfit recommendations, wardrobe management,
outfit history calendar, AI wardrobe analysis, PWA support, feedback system.

Task: Update the README below. Keep sections intact. Set "Last Updated" to ${today}.
Base all feature descriptions on the actual file tree — do not invent features.
If there is no current README, write a complete one.

Current README:
${current || '(empty)'}

Full project file tree:
${tree}

Files modified this session: ${changed}

Return the complete updated README content.`,
    1100,
  );

  return md || current;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const mode = DRY_RUN ? 'dry-run' : 'live';
  console.log(`\nauto-push [${mode}] — ${new Date().toLocaleString()}\n`);

  // 1. Pull
  console.log('1/5  pulling latest from remote...');
  try {
    const out = git('pull', '--rebase', '--autostash');
    console.log('    ', out || 'already up to date');
  } catch (err: any) {
    console.error('     pull failed:', err.message);
    console.error('     resolve conflicts and try again');
    process.exit(1);
  }

  // 2. Pick files
  console.log('\n2/5  selecting files...');
  const pool = collectFiles(ROOT);
  if (pool.length === 0) {
    console.error('     no eligible files found');
    process.exit(1);
  }
  const count = randInt(2, 5);
  const selected = shuffle(pool).slice(0, count);
  selected.forEach(f => console.log(`       ${rel(f)}`));

  // 3. Stamp files
  console.log('\n3/5  stamping files...');
  for (const f of selected) {
    stampFile(f);
    console.log(`     ${DRY_RUN ? '[skip]' : 'wrote'} ${rel(f)}`);
  }

  // 4. Regenerate README
  console.log('\n4/5  regenerating README...');
  const readme = await buildReadme(selected);
  if (!DRY_RUN) {
    fs.writeFileSync(path.join(ROOT, 'README.md'), readme + '\n', 'utf-8');
    console.log('     README.md updated');
  } else {
    console.log('     [skip] README.md');
  }

  // 5. Commit and push
  console.log('\n5/5  committing and pushing...');
  const message = await buildCommitMessage(selected);
  console.log(`     commit: "${message}"`);

  if (DRY_RUN) {
    console.log('\n[dry-run] nothing written or pushed.\n');
    return;
  }

  git('add', '-A');

  if (!hasUncommittedChanges()) {
    console.log('     nothing to commit — files may already be stamped with this timestamp');
    return;
  }

  git('commit', '-m', message);

  // push, auto-setting upstream if this is the first push on the branch
  try {
    git('push');
  } catch {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    git('push', '--set-upstream', 'origin', branch);
  }

  console.log('\ndone. commit is live.\n');
}

main().catch(err => {
  console.error('\nfatal:', err?.message ?? err);
  process.exit(1);
});