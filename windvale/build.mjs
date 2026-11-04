import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';

// Keep development files separate, and generate a portable file for direct opening.
await build({entryPoints:['src/main.js'],bundle:true,format:'esm',target:'es2022',outfile:'app.js',sourcemap:true});
const filenames=['Farmer.glb','Adventurer.glb','WomenMedieval.glb','WomenPunk.glb','WomenSuit.glb'];
const embedded={};
for(const filename of filenames){
  embedded[filename]='data:model/gltf-binary;base64,'+(await readFile('assets/'+filename)).toString('base64');
}
const mainSource=await readFile('src/main.js','utf8');
const pageTemplate=await readFile('src/page.html','utf8');
await writeFile('play.html',pageTemplate);
for(const scene of ['village','cafe','market']){
let source=mainSource;
for(const filename of filenames){
  source=source.replaceAll(JSON.stringify('./assets/'+filename),`EMBEDDED_ASSETS[${JSON.stringify(filename)}]`)
    .replaceAll("'./assets/"+filename+"'",`EMBEDDED_ASSETS[${JSON.stringify(filename)}]`);
}
// Only embed models used in this scene; the other scene entries have their own assets.
const usedNames=scene==='market'?['Adventurer.glb','Farmer.glb']:scene==='cafe'?['Adventurer.glb','WomenSuit.glb']:['Adventurer.glb','WomenMedieval.glb','WomenPunk.glb','Farmer.glb'];
source='const EMBEDDED_ASSETS='+JSON.stringify(Object.fromEntries(usedNames.map(name=>[name,embedded[name]])))+';\n'+source;
const result=await build({stdin:{contents:source,resolveDir:process.cwd()+'/src',sourcefile:'offline-entry.js',loader:'js'},bundle:true,format:'esm',target:'es2022',write:false,minify:true,legalComments:'inline'});
const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
let page=pageTemplate;
page=page.replace('<script type="module" src="./app.js"></script>',()=>'<script type="module">'+script+'</script>')
  .replace('本地运行 · 没有任务','离线可玩 · 没有任务');
page=page.replace('<header>',()=>'<body data-scene="'+scene+'"><header>');
await writeFile(scene+'-walk.html',page);
}
console.log('Built village-walk.html, cafe-walk.html and market-walk.html with embedded assets; play.html is the local-server entry.');
