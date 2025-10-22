// Script to fix Next.js 15 params/searchParams promises
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('app/**/*.tsx', { absolute: true });

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Fix params in function signatures
  if (content.includes('params: { locale:')) {
    content = content.replace(
      /params:\s*\{\s*locale:\s*string\s*\}/g,
      'params: Promise<{ locale: string }>'
    );
    content = content.replace(
      /params:\s*\{\s*locale:\s*string;\s*id:\s*string\s*\}/g,
      'params: Promise<{ locale: string; id: string }>'
    );
    modified = true;
  }
  
  // Fix searchParams
  if (content.includes('searchParams?:') || content.includes('searchParams:')) {
    content = content.replace(
      /searchParams\?:\s*\{[^}]+\}/g,
      (match) => `Promise<${match}>`
    );
    modified = true;
  }
  
  // Fix destructuring
  content = content.replace(
    /(const|let)\s+(\{\s*locale\s*\}|locale)\s*=\s*params\.locale/g,
    'const { locale } = await params'
  );
  content = content.replace(
    /const\s+(\{\s*locale,?\s*id\s*\})\s*=\s*params/g,
    'const { locale, id } = await params'
  );
  
  // Fix searchParams access
  content = content.replace(
    /(const|let)\s+\w+\s*=\s*searchParams\??\./g,
    (match) => {
      const varMatch = match.match(/(\w+)\s*=/);
      return `const ${varMatch[1]} = (await searchParams)?.`;
    }
  );
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
  }
});

console.log('\n✨ Done!');
