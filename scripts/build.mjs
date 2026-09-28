import { access, mkdir, writeFile } from 'node:fs/promises';
for (const file of ['index.html', 'styles.css', 'assets/web/ramo-kuyari.webp', 'migrations/001-commerce.sql', 'dist/server/main.js']) await access(file);
await mkdir('dist', { recursive: true });
await writeFile('dist/build.json', JSON.stringify({ app: 'KUYARI', version: '2.0.0', builtAt: new Date().toISOString() }, null, 2));
process.stdout.write('KUYARI: compilación verificada.\n');
