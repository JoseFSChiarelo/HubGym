const fs = require('fs');
const path = require('path');

// Pastas são irmãs: scripts -> ../../admin-frontend/dist
const sourceDir = path.resolve(__dirname, '..', '..', 'admin-frontend', 'dist');
const targetDir = path.resolve(__dirname, '..', 'renderer');

if (!fs.existsSync(sourceDir)) {
  console.error('Build do frontend não encontrado. Rode "npm run build:renderer" primeiro.');
  process.exit(1);
}

// remove destino se existir
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(sourceDir, targetDir);
console.log('Frontend copiado para', targetDir);
