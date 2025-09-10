#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { cwd } from 'node:process';

// Services deployed in dependency order
// 1) shared-layer must go first (exports Layer ARN)
// Others consume the layer; ws can come last
const SERVICES = [
  'shared-layer',
  'auth',
  'user',
  'projects',
  'messages',
  'ws',
];

function run(cmd, args, workdir) {
  const res = spawnSync(cmd, args, {
    cwd: workdir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    const loc = workdir ? ` in ${workdir}` : '';
    throw new Error(`Command failed${loc}: ${cmd} ${args.join(' ')}`);
  }
}

function hasServerlessConfig(dir) {
  // serverless.yml is required inside each service directory
  return (
    fs.existsSync(resolve(dir, 'serverless.yml')) ||
    fs.existsSync(resolve(dir, 'serverless.yaml'))
  );
}

function main() {
  const [, , action = 'deploy', stageArg] = process.argv;
  const stage = stageArg || process.env.STAGE || 'dev';
  const root = cwd();

  if (!['deploy', 'remove'].includes(action)) {
    console.error(`Unknown action: ${action}. Use: deploy|remove [stage]`);
    process.exit(1);
  }

  console.log(`Orchestrating ${action} for stage "${stage}" from ${root}`);

  for (const svc of SERVICES) {
    const svcDir = resolve(root, svc);
    if (!hasServerlessConfig(svcDir)) {
      console.warn(`Skipping ${svc}: no serverless.yml found`);
      continue;
    }
    console.log(`\n=== ${action.toUpperCase()} :: ${svc} (stage=${stage}) ===`);
    // Prefer locally installed serverless if present; fall back to global
    const cmd = 'serverless';
    const args = [action, '--stage', stage];
    run(cmd, args, svcDir);
  }

  console.log(`\nAll services ${action}ed for stage "${stage}".`);
}

main();
