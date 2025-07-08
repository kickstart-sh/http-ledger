const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dist = './dist';
const files = [];

function scan(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (f.endsWith('.js') || f.endsWith('.d.ts')) {
      files.push(p);
    }
  });
}

if (!fs.existsSync(dist)) {
  console.log('❌ dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

scan(dist);

console.log('\n📦 Bundle Size Report\n');

files.forEach(f => {
  const stats = fs.statSync(f);
  const size = (stats.size / 1024).toFixed(2);
  const gzipped = zlib.gzipSync(fs.readFileSync(f)).length / 1024;
  const relativePath = f.replace('./dist/', '');
  const padding = ' '.repeat(Math.max(0, 30 - relativePath.length));

  console.log(`${relativePath}:${padding}${size}KB (gzipped: ${gzipped.toFixed(2)}KB)`);
});

const total = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
const totalGzipped = files.reduce((sum, f) => sum + zlib.gzipSync(fs.readFileSync(f)).length, 0);

console.log('\n' + '='.repeat(50));
console.log(`Total: ${(total / 1024).toFixed(2)}KB (gzipped: ${(totalGzipped / 1024).toFixed(2)}KB)`);

// Show main entry points separately
console.log('\n📋 Main Entry Points:');
const mainFiles = [
  'index.js',
  'index.d.ts',
  'esm/index.js'
];

mainFiles.forEach(file => {
  const filePath = path.join(dist, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const gzipped = zlib.gzipSync(fs.readFileSync(filePath)).length / 1024;
    console.log(`  ${file}: ${size}KB (gzipped: ${gzipped.toFixed(2)}KB)`);
  }
}); 