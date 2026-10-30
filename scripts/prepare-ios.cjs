const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'MeowLedger/Web');
// Replace only this independent project's generated Web directory.
if(path.resolve(output)!==path.join(root,'MeowLedger','Web'))throw Error('Unexpected output path');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
for(const dir of ['miniprogram','preview','ios'])fs.cpSync(path.join(root,dir),path.join(output,dir),{recursive:true,filter:p=>!['statistics.png','entry.png','mobile.png','desktop.png'].includes(path.basename(p))});
const bundle={wxml:fs.readFileSync(path.join(root,'miniprogram/pages/index/index.wxml'),'utf8'),source:fs.readFileSync(path.join(root,'miniprogram/pages/index/index.js'),'utf8')};
const js='window.MeowBundle='+JSON.stringify(bundle)+';\n';
fs.writeFileSync(path.join(output,'ios/bundle.js'),js);
// Allow a preview of exactly the same offline entry point before copying to Xcode.
fs.writeFileSync(path.join(root,'ios/bundle.js'),js);
console.log('Prepared offline iOS resources: '+output);
