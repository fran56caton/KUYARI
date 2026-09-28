import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { server, close } from './e2e-server.mjs';
if (!server.listening) await once(server, 'listening');
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
child.on('error', () => { close(); process.exit(1); });
child.on('exit', code => { close(); process.exit(code ?? 1); });
