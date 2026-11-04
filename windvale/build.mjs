import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';

// One shared runtime and stylesheet; models remain separate and can be cached.
await build({
  entryPoints:['src/main.js'], bundle:true, format:'esm', target:'es2022',
  outfile:'app.js', sourcemap:true
});
await copyFile('src/page.html','play.html');
await copyFile('src/style.css','style.css');

console.log('Built shared game page, runtime and stylesheet.');
