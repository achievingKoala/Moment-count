import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectCharacterVoice} from '../src/character-voice.js';
test('match gender and language instead of NPC order',()=>{
 const voices=[{name:'Daniel',lang:'en-GB',localService:true},{name:'Samantha',lang:'en-US',localService:true},{name:'Ting-Ting',lang:'zh-CN',localService:true}];
 assert.equal(selectCharacterVoice(voices,'female',true).name,'Samantha');
 assert.equal(selectCharacterVoice(voices,'male',true).name,'Daniel');
 assert.equal(selectCharacterVoice(voices,'female',false).name,'Ting-Ting');
 assert.equal(selectCharacterVoice([voices[0]],'female',true),null);
});


test('wait for first-load voices and do not fall back to the wrong gender',async()=>{
 const {waitForCharacterVoice}=await import('../src/character-voice.js');
 const synth=new EventTarget();let voices=[];synth.getVoices=()=>voices;
 const pending=waitForCharacterVoice(synth,'female',true,100);
 voices=[{name:'Samantha',lang:'en-US'}];synth.dispatchEvent(new Event('voiceschanged'));
 assert.equal((await pending).name,'Samantha');
 voices=[{name:'Daniel',lang:'en-GB'}];
 assert.equal(await waitForCharacterVoice(synth,'female',true,1),null);
});
