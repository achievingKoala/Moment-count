import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateNpcWalk} from '../src/npc-walk.js';
function action(weight){return {getEffectiveWeight:()=>weight,setEffectiveWeight:v=>{weight=v;}};}
test('NPC walks, stops for dialogue and resumes without overshooting',()=>{
 const npc={walkRoute:[[1,0],[0,0]],body:{position:{x:0,z:0},rotation:{y:0}},person:{actions:{walk:action(0),idle:action(1)}}};
 updateNpcWalk(npc,.5,false);assert.equal(npc.body.position.x,.4);
 updateNpcWalk(npc,.5,true);assert.equal(npc.body.position.x,.4);
 updateNpcWalk(npc,2,false);assert.equal(npc.body.position.x,1);assert.equal(npc.walkIndex,1);
 updateNpcWalk(npc,.5,false);assert.equal(npc.body.position.x,.6);
});
