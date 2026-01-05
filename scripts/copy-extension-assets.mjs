import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'dist', 'extension');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return true;
}

function copyDirIfExists(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return false;
  const stat = fs.statSync(fromDir);
  if (!stat.isDirectory()) return false;

  ensureDir(toDir);
  fs.cpSync(fromDir, toDir, { recursive: true });
  return true;
}

ensureDir(outDir);

const assetDirCandidates = [
  path.join(projectRoot, 'extension'),
  path.join(projectRoot, 'public', 'extension'),
  path.join(projectRoot, 'src', 'extension'),
];

let copiedByDir = false;
for (const dir of assetDirCandidates) {
  if (copyDirIfExists(dir, outDir)) {
    copiedByDir = true;
    break;
  }
}

if (!copiedByDir) {
  const files = ['manifest.json', 'timer.html', 'timer.css'];

  for (const filename of files) {
    const candidates = [path.join(projectRoot, filename), path.join(projectRoot, 'src', filename)];

    for (const from of candidates) {
      const to = path.join(outDir, filename);
      if (copyFileIfExists(from, to)) break;
    }
  }

  // prettier-ignore
  const iconCandidates = [
    'icon-16.png',
    'icon-32.png',
    'icon-48.png',
    'icon-128.png',
    'icon-256.png',
    'icon-512.png'
  ];

  for (const icon of iconCandidates) {
    const candidates = [
      path.join(projectRoot, 'public', icon),
      path.join(projectRoot, 'public', 'icons', icon),
      path.join(projectRoot, 'public', 'extension', icon),
    ];

    for (const from of candidates) {
      const to = path.join(outDir, icon);
      if (copyFileIfExists(from, to)) break;
    }
  }
}
