import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
fs.mkdirSync('dist/cloud',{recursive:true});
for(const file of fs.readdirSync('cloud').filter(f=>f.endsWith('.ts'))){
  const compiled=ts.transpileModule(fs.readFileSync(path.join('cloud',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022},fileName:file});
  fs.writeFileSync(path.join('dist/cloud',file.replace(/\.ts$/,'.js')),compiled.outputText);
}
fs.copyFileSync('cloud/seed.json','dist/cloud/seed.json');
fs.mkdirSync('public',{recursive:true});
for(const file of ['index.html','styles.css'])fs.copyFileSync(file,path.join('public',file));
fs.cpSync('assets','public/assets',{recursive:true});
fs.cpSync('dist/client','public/src',{recursive:true});
fs.cpSync('dist/shared','public/shared',{recursive:true});
process.stdout.write('KUYARI letters and persistent hosting adapter built.\n');
