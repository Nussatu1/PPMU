const fs = require('fs');

const html = fs.readFileSync('my.frist.html', 'utf8');
console.log('HTML Total size (bytes):', html.length);
console.log('HTML Head length:', html.indexOf('</head>'));
console.log('Includes <style>:', html.includes('<style'));
console.log('Includes <script>:', html.includes('<script'));
console.log('Does HTML link to any external .js files?', /<script[^>]+src=["'][^"']+\.js["']/i.test(html));
console.log('Does HTML link to any external .css files?', /<link[^>]+href=["'][^"']+\.css["']/i.test(html));

// Verify scripts
const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Number of script tags:', scripts.length);
scripts.forEach((s, idx) => {
  const isInline = !s.includes('src=');
  console.log(`Script ${idx + 1}: inline=${isInline}, length=${s.length}`);
});
