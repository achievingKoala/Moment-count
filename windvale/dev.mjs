import {proxyFetch} from './local-proxy.mjs';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {context} from 'esbuild';
import {onRequestPost,onRequestGet,json} from './functions/api/speaking-feedback.js';

const root=path.dirname(fileURLToPath(import.meta.url));process.chdir(root);
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const localProxy=process.env.LOCAL_AI_PROXY||'http://127.0.0.1:7897';
const localAIFetch=proxyFetch(localProxy);
const bundler=await context({entryPoints:['src/main.js'],bundle:true,format:'esm',target:'es2022',outfile:'app.js',sourcemap:true});
await bundler.watch();await bundler.rebuild();
await import('node:fs/promises').then(fs=>fs.copyFile('src/page.html','play.html'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary','.vrm':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/speaking-feedback'){
      if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)){res.writeHead(403);res.end();return;}
      let response;
      if(req.method==='POST'){
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>14000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'回答内容过长。'}));return;}chunks.push(chunk);}
        response=await onRequestPost({request:new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:Buffer.concat(chunks)}),env:process.env,fetcher:localAIFetch});
      }else response=req.method==='GET'?onRequestGet():json({error:'不支持此请求方式。'},405);
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'play.html';
    if(!/^(?:play\.html|(?:village|cafe|market)-walk\.html|app\.js|assets\/[A-Za-z0-9_.-]+|[A-Za-z0-9_-]+\.png)$/.test(relative)||relative.includes('..')){res.writeHead(404);res.end('Not found');return;}
    const file=path.join(root,relative);if(!(await stat(file)).isFile())throw Error('missing');
    const body=relative==='play.html'?await readFile('src/page.html'):await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT||8080);
server.on('error',async error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用，请关闭原预览服务或设置其他 PORT。`:'本地服务无法启动。');await bundler.dispose();process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Windvale preview: http://127.0.0.1:${port}/play.html?scene=village\nAI: ${process.env.OPENROUTER_API_KEY?'configured':'not configured; fill .env.local and restart'}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await bundler.dispose();process.exit(0);});
