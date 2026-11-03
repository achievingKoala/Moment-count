import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';

// Keep development files separate, and generate a portable file for direct opening.
await build({entryPoints:['src/main.js'],bundle:true,format:'esm',target:'es2022',outfile:'app.js',sourcemap:true});
const filenames=['AnimationLibrary.glb','sample.vrm','sample2.vrm'];
const embedded={};
for(const filename of filenames){
  embedded[filename]='data:model/gltf-binary;base64,'+(await readFile('assets/'+filename)).toString('base64');
}
let source=await readFile('src/main.js','utf8');
for(const filename of filenames){
  source=source.replaceAll(JSON.stringify('./assets/'+filename),`EMBEDDED_ASSETS[${JSON.stringify(filename)}]`)
    .replaceAll("'./assets/"+filename+"'",`EMBEDDED_ASSETS[${JSON.stringify(filename)}]`);
}
source='const EMBEDDED_ASSETS='+JSON.stringify(embedded)+';\n'+source;
const result=await build({stdin:{contents:source,resolveDir:process.cwd()+'/src',sourcefile:'offline-entry.js',loader:'js'},bundle:true,format:'esm',target:'es2022',write:false,minify:true,legalComments:'inline'});
const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
let page=await readFile('src/page.html','utf8');
page=page.replace('<script type="module" src="./app.js"></script>',()=>'<script type="module">'+script+'</script>')
  .replace('本地运行 · 没有任务','离线可玩 · 没有任务');
await writeFile('village-walk.html',page);
console.log('Built village-walk.html: direct file opening supported, all models and animations embedded.');
