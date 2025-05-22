#!/usr/bin/env node
/**
 * Script to run both the Next.js dev server and FastAPI server concurrently
 */

const { spawn } = require('child_process');
const path = require('path');

// Make the bash scripts executable
const { execSync } = require('child_process');
try {
  execSync('chmod +x scripts/setup_fastapi.sh scripts/start_fastapi.sh', { stdio: 'inherit' });
  console.log('Made bash scripts executable');
} catch (error) {
  console.error('Error making scripts executable:', error);
}

// Function to run a process
function runProcess(command, args, name) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true
  });

  console.log(`[${name}] Starting...`);

  proc.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${name}] ${data.toString().trim()}`);
  });

  proc.on('close', (code) => {
    console.log(`[${name}] Process exited with code ${code}`);
  });

  return proc;
}

// Start Next.js dev server
const nextProcess = runProcess('NODE_OPTIONS="--require=trainloop-evals-sdk"', ['npx', 'next', 'dev'], 'Next.js');

// Start FastAPI server
const scriptPath = path.join(__dirname, 'start_fastapi.sh');
const fastApiProcess = runProcess(scriptPath, [], 'FastAPI');

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping all processes...');
  nextProcess.kill('SIGINT');
  fastApiProcess.kill('SIGINT');
  process.exit(0);
});

console.log('Running both servers. Press Ctrl+C to stop.');
