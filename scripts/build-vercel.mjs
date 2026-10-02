import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createHash} from 'node:crypto';
fs.mkdirSync('dist/cloud',{recursive:true});
for(const file of fs.readdirSync('cloud').filter(f=>f.endsWith('.ts'))){
  const compiled=ts.transpileModule(fs.readFileSync(path.join('cloud',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022},fileName:file});
  fs.writeFileSync(path.join('dist/cloud',file.replace(/\.ts$/,'.js')),compiled.outputText);
}
// Version the module graph together so a newly published page never mixes old and new features.
const browserFiles=['dist/client','dist/shared'].flatMap(dir=>fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort().map(f=>path.join(dir,f)));
const browserVersion=createHash('sha256').update(browserFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n')).digest('hex').slice(0,12);
for(const file of browserFiles){const source=fs.readFileSync(file,'utf8');fs.writeFileSync(file,source.replace(/(['"])(\.{1,2}\/[^'"\s]+\.js)\1/g,(_match,quote,specifier)=>`${quote}${specifier}?v=${browserVersion}${quote}`));}
fs.copyFileSync('cloud/seed.json','dist/cloud/seed.json');
fs.mkdirSync('public',{recursive:true});
for(const file of ['index.html','styles.css'])fs.copyFileSync(file,path.join('public',file));
fs.cpSync('assets','public/assets',{recursive:true});
fs.cpSync('dist/client','public/src',{recursive:true});
fs.cpSync('dist/shared','public/shared',{recursive:true});
process.stdout.write('KUYARI letters and persistent hosting adapter built.\n');
