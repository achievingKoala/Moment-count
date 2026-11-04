import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost,onRequestGet,validFeedback,connectionFailure} from '../functions/api/speaking-feedback.js';
import {createFeedbackController} from '../src/speaking-feedback.js';

const answer='I enjoy read books in my free time because they help me relax.';
const valid={referenceBand:5.5,summary:'回答切题，有一个动词形式问题。',onTopic:true,strengths:['解释了阅读的原因。'],improvements:['enjoy 后面接动名词。'],corrections:[{original:'enjoy read',revised:'enjoy reading',reason:'enjoy 后面接动名词。'}],improvedAnswer:'I enjoy reading books in my free time because they help me relax.'};
let ip=0;
function request(body){return new Request('http://localhost/api/speaking-feedback',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':String(++ip)},body:JSON.stringify(body)});}
test('reject invalid input; report missing key honestly',async()=>{
  assert.equal((await onRequestPost({request:request({question:'?',answer:''})})).status,400);
  const response=await onRequestPost({request:request({question:'What do you enjoy?',answer})});assert.equal(response.status,503);assert.equal((await response.json()).code,'ai_not_configured');assert.equal(onRequestGet().status,405);
});
test('validate exact correction evidence and half-band range',()=>{
  assert(validFeedback(valid,answer));assert(!validFeedback({...valid,referenceBand:6.3},answer));assert(!validFeedback({...valid,corrections:[{original:'invented phrase',revised:'something',reason:'reason'}]},answer));
});
test('send only question and answer as untrusted JSON and return valid feedback',async()=>{
  const previous=globalThis.fetch;let sent;
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:JSON.stringify(valid)}}]});};
  try{const response=await onRequestPost({request:request({question:'What do you enjoy?',answer}),env:{OPENROUTER_API_KEY:'test-key',OPENROUTER_SPEAKING_MODEL:'test-model'}});assert.equal(response.status,200);const payload=await response.json();assert.equal(payload.feedback.referenceBand,5.5);assert(payload.disclaimer.includes('不评估发音'));assert.equal(sent.model,'test-model');assert.deepEqual(JSON.parse(sent.messages[1].content),{part:1,question:'What do you enjoy?',answer});}finally{globalThis.fetch=previous;}
});
test('short answers have no numeric estimate',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({...valid,corrections:[]})}}]});
  try{const response=await onRequestPost({request:request({question:'Do you like reading?',answer:'Yes, I do.'}),env:{OPENROUTER_API_KEY:'test'}});assert.equal((await response.json()).feedback.referenceBand,null);}finally{globalThis.fetch=previous;}
});
test('upstream errors, malformed JSON and timeout are recoverable',async()=>{
  const previous=globalThis.fetch;
  try{for(const [upstream,expected] of [[async()=>new Response('',{status:402}),502],[async()=>Response.json({choices:[{message:{content:'not json'}}]}),502],[async()=>{throw new DOMException('timeout','AbortError');},504]]){globalThis.fetch=upstream;const response=await onRequestPost({request:request({question:'What do you enjoy?',answer}),env:{OPENROUTER_API_KEY:'test'}});assert.equal(response.status,expected);assert((await response.json()).error);}}finally{globalThis.fetch=previous;}
});

function element(){return {hidden:true,textContent:'',disabled:false,value:'',children:[],listeners:{},append(e){this.children.push(e);},replaceChildren(){this.children=[];},addEventListener(type,fn){this.listeners[type]=fn;},focus(){}};}
test('frontend cancels stale responses and shows only key errors and improvements',async()=>{
  const oldDocument=globalThis.document,oldLocation=globalThis.location;const elements={};const submit=element();const input=element();let applied='';let resolveFetch;
  globalThis.document={getElementById:id=>elements[id]??=element(),querySelector:()=>submit,createElement:()=>element()};globalThis.location={protocol:'http:'};
  try{const controller=createFeedbackController({input,onApply:value=>applied=value,fetcher:()=>new Promise(resolve=>resolveFetch=resolve)});
    controller.showHistory('Question');assert.equal(elements['ai-feedback'].hidden,true);elements['feedback-toggle'].onclick();assert.equal(elements['ai-feedback'].hidden,false);elements['feedback-toggle'].onclick();assert.equal(elements['ai-feedback'].hidden,true);const first=controller.request('Question',answer);controller.cancel();resolveFetch(Response.json({feedback:valid,disclaimer:'Text only'}));await first;assert.equal(elements['ai-feedback'].hidden,true);assert.equal(elements['ai-feedback-content'].children.length,0);assert.equal(submit.disabled,false);
    const second=controller.request('Question',answer);resolveFetch(Response.json({feedback:valid,disclaimer:'Text only'}));await second;assert.equal(elements['ai-feedback-status'].textContent,'点评完成（记录仅在当前页面保留）');assert.deepEqual(elements['ai-feedback-content'].children.filter(e=>e.textContent==='主要错误'||e.textContent==='改进点').map(e=>e.textContent),['主要错误','改进点']);assert(elements['ai-feedback-content'].children.some(e=>e.textContent==='文字表达参考分：5.5 / 9'));assert(!elements['ai-feedback-content'].children.some(e=>e.textContent.includes('改进回答')));
    assert.equal(elements['feedback-counter'].textContent,'1 / 1');assert.equal(elements['feedback-previous'].disabled,true);assert.equal(elements['feedback-next'].disabled,true);const failed=controller.request('Question','failed answer');assert.equal(elements['ai-feedback-content'].children.length,0);assert.equal(elements['feedback-previous'].hidden,true);assert.equal(elements['feedback-next'].hidden,true);assert(elements['ai-feedback-status'].textContent.startsWith('AI 正在点评你的文字回答…'));resolveFetch(Response.json({error:'请重试'},{status:502}));await failed;assert.equal(elements['feedback-counter'].textContent,'1 / 1');assert.equal(elements['ai-feedback-status'].textContent,'请重试');assert(!elements['ai-feedback-content'].children.some(e=>e.textContent.includes('failed answer')));const previousFeedback=elements['ai-feedback-content'].children.length;input.listeners.input();assert.equal(elements['ai-feedback'].hidden,false);assert.equal(elements['ai-feedback-content'].children.length,previousFeedback);
  }finally{globalThis.document=oldDocument;globalThis.location=oldLocation;}
});

test('distinguish network errors from invalid AI responses',()=>{
assert.equal(connectionFailure({name:'TypeError',cause:{code:'ENOTFOUND'}}).code,'ai_dns_failed');
assert.equal(connectionFailure({name:'TypeError',cause:{code:'UND_ERR_CONNECT_TIMEOUT'}}).code,'ai_connect_timeout');
assert.equal(connectionFailure({name:'SyntaxError'}).code,'ai_invalid_response');
});


test('submission history persists answers and feedback across reloads', async()=>{
  const {createPracticeHistory}=await import('../src/practice-history.js');
  const data=new Map(); const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const history=createPracticeHistory(storage);
  const {record,saved}=history.add('What do you enjoy?',answer);assert(saved);
  history.update(record,{status:'点评完成',feedback:valid});
  const restored=createPracticeHistory(storage).all();
  assert.equal(restored.length,1);assert.equal(restored[0].answer,answer);assert.deepEqual(restored[0].feedback,valid);
  assert.equal(createPracticeHistory({getItem:()=>'{broken'}).all().length,0);
  assert.equal(createPracticeHistory().add('Question',answer).saved,false);
});


test('page template includes all feedback card controls', async()=>{
  const {readFile}=await import('node:fs/promises');
  const page=await readFile(new URL('../src/page.html',import.meta.url),'utf8');
  for(const id of ['feedback-toggle','feedback-previous','feedback-next','feedback-counter','ai-feedback-status','ai-feedback-content']) {
    assert.equal(page.split(`id="${id}"`).length-1,1,`missing or duplicate ${id}`);
  }
});
