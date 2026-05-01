import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const envPath = resolve(projectRoot, '.env');
const envExamplePath = resolve(projectRoot, '.env.example');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`\nCommand failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

function parseEnv(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function ensureEnvFile() {
  if (existsSync(envPath)) {
    console.log('.env already exists, leaving it as-is.');
    return;
  }
  if (!existsSync(envExamplePath)) {
    console.error('Error: .env.example is missing. Cannot create .env.');
    process.exit(1);
  }
  copyFileSync(envExamplePath, envPath);
  console.log('Created .env from .env.example');
}

async function waitForPostgres(user) {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', user],
      { cwd: projectRoot, stdio: 'ignore', shell: true },
    );
    if (result.status === 0) {
      console.log(`PostgreSQL is ready (attempt ${attempt}).`);
      return;
    }
    process.stdout.write(`Waiting for PostgreSQL... (${attempt}/${maxAttempts})\r`);
    await sleep(1000);
  }
  console.error(
    '\nPostgreSQL did not become healthy in 30 seconds. Check `docker compose logs postgres`.',
  );
  process.exit(1);
}

async function main() {
  console.log('Setting up demo-exchange...\n');

  ensureEnvFile();

  const env = parseEnv(readFileSync(envPath, 'utf8'));
  const postgresUser = env.POSTGRES_USER ?? 'exchange';

  console.log('\nInstalling dependencies...');
  run('npm', ['install']);

  console.log('\nStarting PostgreSQL...');
  run('docker', ['compose', 'up', '-d']);

  console.log('\nWaiting for PostgreSQL to become healthy...');
  await waitForPostgres(postgresUser);

  console.log(`✓ Setup complete.`);
}

main();
