import {spawn} from 'node:child_process';

// Local development only. Credentials and request body travel through stdin, not process arguments.
export function proxyFetch(proxy){
  return (url,options={})=>new Promise((resolve,reject)=>{
    if(url!=='https://openrouter.ai/api/v1/chat/completions')return reject(new Error('Unexpected upstream URL'));
    if(options.signal?.aborted)return reject(new DOMException('Aborted','AbortError'));
    const config=[...Object.entries(options.headers||{}).map(([key,value])=>`header = ${JSON.stringify(key+': '+value)}`),`data = ${JSON.stringify(options.body||'')}`].join('\n');
    const child=spawn('curl',['--silent','--show-error','--proxy',proxy,'--connect-timeout','10','--max-time','28','--request','POST','--config','-','--write-out','\n%{http_code}',url],{stdio:['pipe','pipe','pipe']});
    const chunks=[];let bytes=0,aborted=false;
    const abort=()=>{aborted=true;child.kill();};options.signal?.addEventListener('abort',abort,{once:true});
    child.stdin.on('error',()=>{});child.stderr.resume();
    child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>1024*1024){aborted=true;child.kill();}else chunks.push(chunk);});
    child.on('error',error=>{options.signal?.removeEventListener('abort',abort);reject(error);});
    child.on('close',code=>{
      options.signal?.removeEventListener('abort',abort);
      if(aborted)return reject(new DOMException('Aborted','AbortError'));
      if(code!==0){const error=new Error('Local proxy connection failed');error.cause={code:code===28?'UND_ERR_CONNECT_TIMEOUT':'LOCAL_PROXY_FAILED'};return reject(error);}
      const raw=Buffer.concat(chunks).toString('utf8'),split=raw.lastIndexOf('\n'),status=Number(raw.slice(split+1));
      if(status<200||status>599)return reject(new Error('Invalid upstream status'));
      resolve(new Response(raw.slice(0,split),{status,headers:{'Content-Type':'application/json'}}));
    });
    child.stdin.end(config);
  });
}
