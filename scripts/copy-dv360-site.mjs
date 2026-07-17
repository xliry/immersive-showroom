import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'dv360');
const target = path.join(root, 'dist', 'dv360');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(source, 'preview.html'), path.join(target, 'index.html'));
fs.cpSync(path.join(source, 'output'), path.join(target, 'output'), { recursive: true });

console.log('DV360 preview published to dist/dv360/');
