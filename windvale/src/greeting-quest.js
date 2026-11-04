export const GREETING_QUEST_KEY='windvale.progress.v1';

export function createGreetingQuest(storage){
  let completed=false;
  try{completed=JSON.parse(storage?.getItem(GREETING_QUEST_KEY)||'null')?.greetingCompleted===true;}catch{}
  return {
    refresh(){
      try{if(storage)completed=JSON.parse(storage.getItem(GREETING_QUEST_KEY)||'null')?.greetingCompleted===true;}catch{}
    },
    get completed(){return completed;},
    get coins(){return completed?10:0;},
    complete(){
      if(completed)return {awarded:false,saved:true};
      // Completion and its one-time reward share one record, including after reload.
      let saved=false;
      try{storage?.setItem(GREETING_QUEST_KEY,JSON.stringify({version:1,greetingCompleted:true,coins:10}));saved=Boolean(storage);}catch{}
      completed=true;
      return {awarded:true,saved};
    }
  };
}
