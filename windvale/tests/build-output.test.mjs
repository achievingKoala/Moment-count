import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
test('only the shared game entry is published',async()=>{
 for(const scene of ['village','cafe','market']){
  await assert.rejects(access(new URL(`../${scene}-walk.html`,import.meta.url)),{code:'ENOENT'});
 }
 const page=await readFile(new URL('../play.html',import.meta.url),'utf8');
 assert(page.includes('./app.js'));assert(page.includes('./style.css'));
});
