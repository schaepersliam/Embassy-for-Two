(function(root){
'use strict';
const clamp=n=>Math.max(0,Math.min(100,n));
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let v=Math.imul(t^(t>>>15),1|t);v^=v+Math.imul(v^(v>>>7),61|v);return((v^(v>>>14))>>>0)/4294967296;};}
function shuffle(items,random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function makeRound(kind,fields){return{kind,...fields,clues:1,pin:null,tries:0,wrong:[],selected:[],submitted:[],eliminated:[],confirmed:[],favours:{host:false,allies:false,president:false},message:'',solved:false,assisted:false,points:0};}
function generate(seed,data,history=[]){
 const random=rng(seed),ids=data.countries.map(c=>c.id);
 const cycle=history.slice(Math.floor(history.length/ids.length)*ids.length).map(h=>h.hostId);
 const host=shuffle(ids.filter(id=>!cycle.includes(id)),random)[0];
 const recent=history.slice(-3).flatMap(h=>h.tradeIds||[]);
 let pool=ids.filter(id=>id!==host&&!recent.includes(id));
 if(pool.length<2)pool=ids.filter(id=>id!==host);
 const first=shuffle(pool,random)[0];
 const modes=['markets','export-goods','import-goods'].filter(m=>m!==history.at(-1)?.tradeMode);
 const tradeMode=shuffle(modes,random)[0];
 const eligible=pool.filter(id=>id!==first&&(tradeMode!=='markets'||data.countries.find(c=>c.id===id).markets));
 const second=shuffle(eligible.length?eligible:ids.filter(id=>id!==host&&id!==first&&(tradeMode!=='markets'||data.countries.find(c=>c.id===id).markets)),random)[0];
 const trade=[first,second];
 const optionIds=target=>shuffle([target,...shuffle(ids.filter(id=>id!==target),random).slice(0,5)],random);
 const lastRules=history.slice(-1).flatMap(h=>h.ruleIds||[]);
 const valid=data.rules.filter(rule=>data.countries.filter(rule.test).length>=3&&data.countries.filter(c=>!rule.test(c)).length>=3);
 const fresh=valid.filter(rule=>!lastRules.includes(rule.id));
 const picked=shuffle(fresh.length>=2?fresh:valid,random).slice(0,2);
 const political=picked.map(rule=>{
  const yes=shuffle(data.countries.filter(rule.test),random).slice(0,3).map(c=>c.id);
  const no=shuffle(data.countries.filter(c=>!rule.test(c)),random).slice(0,3).map(c=>c.id);
  return makeRound('connections',{ruleId:rule.id,answers:yes,options:shuffle([...yes,...no],random)});
 });
 const hidden=makeHidden(seed,data,history,random);
 return{version:3,features:3,seed:seed>>>0,hostId:host,index:0,phase:'play',favours:{host:45,allies:45,president:45},rounds:[makeRound('map',{target:host}),makeRound('exports',{target:trade[0],answer:trade[0],options:optionIds(trade[0])}),hidden,makePickFive(trade[1],tradeMode),political[1]],postcard:'',recipeSaved:false,completedAt:null};
}
function makePickFive(target,mode='markets'){return makeRound('partner',{target,mode,options:[],picks:[],hits:[]});}
function makeHidden(seed,data,history=[],random=rng(seed^0xABCDEF)){
 const recent=history.slice(-1).flatMap(h=>h.ruleIds||[]);
 const themes=data.themes.filter(t=>!recent.includes(t.id));
 const theme=shuffle(themes.length?themes:data.themes,random)[0];
 const answers=theme.fixed?[...theme.fixed]:shuffle(data.countries.filter(theme.test),random).slice(0,3).map(c=>c.id);
 const no=data.countries.filter(c=>theme.fixed?!answers.includes(c.id):!theme.test(c));
 return makeRound('hidden',{themeId:theme.id,linkClues:0,answers,options:shuffle([...answers,...shuffle(no,random).slice(0,3).map(c=>c.id)],random)});
}
function upgrade(s,data){
 if(s.features>=2){s.rounds[3].mode=s.rounds[3].mode||'markets';s.features=3;return s;}
 if(!s.rounds[2].solved)s.rounds[2]=makeHidden(s.seed,data);
 if(!s.rounds[3].solved){const old=s.rounds[3].target;const target=data.countries.find(c=>c.id===old&&c.markets)||data.countries.find(c=>c.markets&&c.id!==s.hostId&&c.id!==s.rounds[1].target);s.rounds[3]=makePickFive(target.id);}
 s.features=3;s.recipeSaved=s.recipeSaved||false;return s;
}
function current(s){return s.rounds[s.index];}
function distance(a,b){const r=n=>n*Math.PI/180;const h=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
function settle(s,round,points,assisted=false){
 if(s.phase!=='play'||round.solved)return false;
 round.solved=true;round.points=clamp(points);round.assisted=assisted;s.phase='result';
 const resource=round.kind==='map'?'host':['connections','hidden'].includes(round.kind)?'allies':'president';
 const reward=assisted?4:12,before=s.favours[resource];s.favours[resource]=clamp(before+reward);round.reward={resource,amount:s.favours[resource]-before};
 return true;
}
function score(round){return Math.max(20,100-15*Math.max(0,round.tries-(round.favours.president?1:0)));}
function mapScore(km,clues=1){return km<=30?100:Math.max(5,Math.round(100*Math.exp(-(km-30)/2200))-5*(clues-1));}
function resetSelection(s){const r=current(s);if(s.phase!=='play'||!['hidden','connections'].includes(r.kind))return false;r.selected=[];r.message='All seats cleared. Your clues and confirmed countries stay available.';return true;}
function lockMap(s,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='map'||!r.pin||!Number.isFinite(r.pin.lat)||!Number.isFinite(r.pin.lng)||Math.abs(r.pin.lat)>85||Math.abs(r.pin.lng)>180)return false;
 r.km=distance(r.pin,data.countries.find(c=>c.id===r.target));
 return settle(s,r,mapScore(r.km,r.clues));
}
function answer(s,choice){
 const r=current(s);if(s.phase!=='play'||r.kind!=='exports'||!r.options.includes(choice)||r.eliminated.includes(choice)||r.wrong.includes(choice))return false;
 if(choice===r.answer)return settle(s,r,score(r));
 r.tries++;r.wrong.push(choice);r.message='That delegation doesn’t match. Talk it through and try another.';return true;
}
function select(s,id){
 const r=current(s);if(s.phase!=='play'||!['connections','hidden'].includes(r.kind)||!r.options.includes(id)||r.eliminated.includes(id))return false;
 if(r.selected.includes(id))r.selected=r.selected.filter(x=>x!==id);
 else if(r.selected.length<3)r.selected.push(id);
 else{r.message='Three seats at this table. Unselect a country to swap it.';return false;}
 r.message='';return true;
}
function checkSet(s){
 const r=current(s);if(s.phase!=='play'||!['connections','hidden'].includes(r.kind))return false;
 if(r.selected.length!==3){r.message='Choose exactly three countries together.';return false;}
 const signature=[...r.selected].sort().join(',');
 if(r.submitted.includes(signature)){r.message='You already tried that trio. Swap a country and try again.';return false;}
 r.submitted.push(signature);const correct=r.selected.filter(id=>r.answers.includes(id)).length;
 if(correct===3)return settle(s,r,score(r));
 const priorClues=r.linkClues;
 r.tries++;if(r.kind==='hidden')r.linkClues=Math.min(3,r.linkClues+1);
 r.message=r.kind==='hidden'?(priorClues>=3?'That isn’t the intended trio. All three clues are open; try a different combination.':`That isn’t the intended trio. A new clue has opened${r.linkClues===3?' (the final clue is now visible)':''}.`):`${correct} of those 3 belong at this table. Swap a country and try again.`;return true;
}
function addPick(s,text,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='partner'||!Array.isArray(r.picks))return false;
 const goods=r.mode&&r.mode!=='markets',name=goods?data.normalizeGood(text):data.normalizeCountry(text);
 if(!name){r.message=goods?'Choose a product from the suggestions, or enter its six-digit HS code.':'Choose a recognised country from the search suggestions.';return false;}
 if(!goods&&name===data.countries.find(c=>c.id===r.target).name){r.message='An export destination must be another country.';return false;}
 if(r.picks.includes(name)){r.message='That answer is already on your list.';return false;}
 if(r.picks.length>=5){r.message='Your five picks are ready. Remove one to change it.';return false;}
 r.picks.push(name);r.message=r.picks.length===5?'Five picks ready. Lock them to reveal the true ranking.':'';return true;
}
function lockPicks(s,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='partner'||!r.picks||r.picks.length!==5)return false;
 const names=data.pickFiveRows(r).map(m=>m[0]);
 r.hits=r.picks.filter(name=>names.includes(name));return settle(s,r,r.hits.length*20);
}
function useFavour(s,kind,data){
 const r=current(s);const cost=kind==='president'?20:15;
 if(s.phase!=='play'||r.kind==='map'||r.favours[kind]||s.favours[kind]<cost)return false;
 if(kind==='president'&&r.tries===0)return false;
 if(!['host','allies','president'].includes(kind))return false;
 if(kind==='host'&&r.kind==='hidden'&&r.linkClues>=3)return false;
 if(kind==='host'&&r.kind==='hidden')r.linkClues=Math.min(3,r.linkClues+1);
 if(kind==='allies'){
  if(r.kind==='partner'){
   if(r.picks.length>=5)return false;
   const name=data.pickFiveRows(r).map(m=>m[0]).find(name=>!r.picks.includes(name));
   r.picks.push(name);r.confirmed.push(name);
  }else if(['connections','hidden'].includes(r.kind)){
   const id=r.answers.find(id=>!r.confirmed.includes(id));r.confirmed.push(id);
   if(!r.selected.includes(id)){if(r.selected.length===3)r.selected.pop();r.selected.push(id);}
  }else{
   const id=r.options.find(id=>id!==r.answer&&!r.eliminated.includes(id)&&!r.wrong.includes(id));
   if(!id)return false;r.eliminated.push(id);
  }
 }
 r.favours[kind]=true;s.favours[kind]-=cost;
 r.message=kind==='president'?'Washington gives you a second chance: one wrong attempt will not cost points.':kind==='allies'?(r.kind==='partner'?'Your ally suggested one of the true top five.':'Your ally has marked one useful card.'):'A local tip is now open below the puzzle.';
 return true;
}
function reveal(s){const r=current(s);if(s.phase!=='play'||r.kind==='map')return false;return settle(s,r,0,true);}
function advance(s){if(s.phase!=='result')return false;if(s.index===s.rounds.length-1){s.phase='summit';s.completedAt=s.completedAt||new Date().toISOString();}else{s.index++;s.phase='play';}return true;}
function historyEntry(s){return{seed:s.seed,hostId:s.hostId,tradeIds:s.rounds.filter(r=>r.kind==='exports'||r.kind==='partner').map(r=>r.target),ruleIds:s.rounds.filter(r=>['connections','hidden'].includes(r.kind)).map(r=>r.ruleId||r.themeId),points:s.rounds.reduce((n,r)=>n+r.points,0),assisted:s.rounds.filter(r=>r.assisted).length,completedAt:s.completedAt,postcard:s.postcard,activityId:s.activityId??null,tradeMode:s.rounds[3].mode||'markets',roundScores:s.rounds.map(r=>r.points),recipeSaved:!!s.recipeSaved,travelSaved:!!s.travelSaved};}
function validate(s,data){
 if(!s||s.version!==3||!Number.isInteger(s.seed)||!data.countries.some(c=>c.id===s.hostId)||!['play','result','summit'].includes(s.phase)||!Number.isInteger(s.index)||s.index<0||s.index>4||!Array.isArray(s.rounds)||s.rounds.length!==5||!s.favours)return false;
 if(!['host','allies','president'].every(k=>Number.isFinite(s.favours[k])&&s.favours[k]>=0&&s.favours[k]<=100))return false;
 return s.rounds.every(r=>r&&['map','exports','partner','connections','hidden'].includes(r.kind)&&Array.isArray(r.selected)&&Array.isArray(r.wrong)&&Array.isArray(r.eliminated)&&Array.isArray(r.confirmed)&&Array.isArray(r.submitted)&&r.favours&&Number.isInteger(r.tries)&&r.tries>=0&&Number.isInteger(r.clues)&&r.clues>=1&&r.clues<=5&&(r.kind==='hidden'?data.themes.some(t=>t.id===r.themeId)&&Array.isArray(r.answers)&&r.answers.length===3:r.kind==='connections'?data.rules.some(rule=>rule.id===r.ruleId)&&Array.isArray(r.answers)&&r.answers.length===3:Array.isArray(r.options)||r.kind==='map'));
}
const api={mapScore,resetSelection,generate,upgrade,current,distance,lockMap,answer,select,checkSet,addPick,lockPicks,useFavour,reveal,advance,historyEntry,validate};root.CircuitEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
