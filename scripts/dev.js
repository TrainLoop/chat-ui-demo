#!/usr/bin/env node
/**
 * Script to run the Next.js dev server and optionally FastAPI and/or Go servers concurrently
 * Usage: 
 *   npm run dev          - runs all servers
 *   npm run dev -- next  - runs only Next.js
 *   npm run dev -- next fastapi  - runs Next.js and FastAPI
 *   npm run dev -- next go       - runs Next.js and Go
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let serversToRun = ['next', 'fastapi', 'go']; // Default: run all servers

if (args.length > 0) {
  serversToRun = args;
}

// Make the bash scripts executable
const { execSync } = require('child_process');
try {
  execSync('chmod +x scripts/setup_fastapi.sh scripts/start_fastapi.sh scripts/setup_go.sh scripts/start_go.sh', { stdio: 'inherit' });
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

const processes = [];

// Start Next.js dev server if requested
if (serversToRun.includes('next')) {
  const nextProcess = runProcess('NODE_OPTIONS="--require=trainloop-llm-logging"', ['npx', 'next', 'dev'], 'Next.js');
  processes.push(nextProcess);
}

// Start FastAPI server if requested
if (serversToRun.includes('fastapi')) {
  const fastApiScriptPath = path.join(__dirname, 'start_fastapi.sh');
  const fastApiProcess = runProcess(fastApiScriptPath, [], 'FastAPI');
  processes.push(fastApiProcess);
}

// Start Go server if requested
if (serversToRun.includes('go')) {
  const goScriptPath = path.join(__dirname, 'start_go.sh');
  const goProcess = runProcess(goScriptPath, [], 'Go');
  processes.push(goProcess);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping all processes...');
  processes.forEach(proc => proc.kill('SIGINT'));
  process.exit(0);
});

console.log(`Running servers: ${serversToRun.join(', ')}. Press Ctrl+C to stop.`);
