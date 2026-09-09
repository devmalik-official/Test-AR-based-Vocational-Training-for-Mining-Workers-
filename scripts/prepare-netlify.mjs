import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('vendor', { recursive: true });
await copyFile('node_modules/three/build/three.module.js', 'vendor/three.module.js');
