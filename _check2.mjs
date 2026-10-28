import fs from 'node:fs';
const h = fs.readFileSync('docs/index.html', 'utf8');
const hover = [...h.matchAll(/data-group="([a-z]+)"\]:hover \.card-shop/g)].length;
const plain = [...h.matchAll(/data-group="([a-z]+)"\] \.card-shop/g)].length;
console.log('hoverRules=' + hover + ' plainRules=' + plain);
console.log('yenCount=' + ((h.match(/\uFFE5[0-9,]+\u5186/g) || []).length));
console.log('baseGray=' + h.includes('.card-shop{background:#F0F1F2'));
console.log('currencyInData=' + h.includes('currency: it.currency'));
