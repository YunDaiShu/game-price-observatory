import fs from 'node:fs';
const h = fs.readFileSync('docs/index.html', 'utf8');
console.log('btns=' + (h.match(/card-shop/g) || []).length);
console.log('radiusCard=' + /border-radius:var\(--radius-card\);display:flex/.test(h));
console.log('alwaysOn=' + /opacity:1;pointer-events:auto;z-index:10/.test(h));
console.log('arrowRight=' + h.includes('\u2192</a>'));
console.log('arrowUpRightStill=' + h.includes('cover-go'));
