import fs from 'node:fs';
const h = fs.readFileSync('docs/index.html', 'utf8');
const parts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
parts.forEach((p, i) => fs.writeFileSync('_s' + (i + 1) + '.js', p, 'utf8'));
console.log('scripts=' + parts.length + ' sizes=' + parts.map((p) => p.length).join(','));
