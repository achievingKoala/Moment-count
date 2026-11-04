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
