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
 const trade=shuffle(pool,random).slice(0,2);
 const optionIds=target=>shuffle([target,...shuffle(ids.filter(id=>id!==target),random).slice(0,5)],random);
 const exporter=data.countries.find(c=>c.id===trade[1]);
 const partner=exporter.partner;
 const partnerOptions=shuffle([partner,...shuffle(Object.keys(data.partnerRegions).filter(name=>name!==partner&&name!==exporter.name),random).slice(0,5)],random);
 const lastRules=history.slice(-1).flatMap(h=>h.ruleIds||[]);
 const valid=data.rules.filter(rule=>data.countries.filter(rule.test).length>=3&&data.countries.filter(c=>!rule.test(c)).length>=3);
 const fresh=valid.filter(rule=>!lastRules.includes(rule.id));
 const picked=shuffle(fresh.length>=2?fresh:valid,random).slice(0,2);
 const political=picked.map(rule=>{
  const yes=shuffle(data.countries.filter(rule.test),random).slice(0,3).map(c=>c.id);
  const no=shuffle(data.countries.filter(c=>!rule.test(c)),random).slice(0,3).map(c=>c.id);
  return makeRound('connections',{ruleId:rule.id,answers:yes,options:shuffle([...yes,...no],random)});
 });
 return{version:3,seed:seed>>>0,hostId:host,index:0,phase:'play',favours:{host:45,allies:45,president:45},rounds:[makeRound('map',{target:host}),makeRound('exports',{target:trade[0],answer:trade[0],options:optionIds(trade[0])}),political[0],makeRound('partner',{target:trade[1],answer:partner,options:partnerOptions}),political[1]],postcard:'',completedAt:null};
}
function current(s){return s.rounds[s.index];}
function distance(a,b){const r=n=>n*Math.PI/180;const h=Math.sin(r(b.lat-a.lat)/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(r(b.lng-a.lng)/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
function settle(s,round,points,assisted=false){
 if(s.phase!=='play'||round.solved)return false;
 round.solved=true;round.points=clamp(points);round.assisted=assisted;s.phase='result';
 const resource=round.kind==='map'?'host':round.kind==='connections'?'allies':'president';
 const reward=assisted?4:12,before=s.favours[resource];s.favours[resource]=clamp(before+reward);round.reward={resource,amount:s.favours[resource]-before};
 return true;
}
function score(round){return Math.max(20,100-15*Math.max(0,round.tries-(round.favours.president?1:0)));}
function lockMap(s,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='map'||!r.pin||!Number.isFinite(r.pin.lat)||!Number.isFinite(r.pin.lng)||Math.abs(r.pin.lat)>85||Math.abs(r.pin.lng)>180)return false;
 r.km=distance(r.pin,data.countries.find(c=>c.id===r.target));
 return settle(s,r,Math.max(0,Math.round(100*Math.exp(-r.km/500))-5*(r.clues-1)));
}
function answer(s,choice){
 const r=current(s);if(s.phase!=='play'||!['exports','partner'].includes(r.kind)||!r.options.includes(choice)||r.eliminated.includes(choice)||r.wrong.includes(choice))return false;
 if(choice===r.answer)return settle(s,r,score(r));
 r.tries++;r.wrong.push(choice);r.message='That delegation doesn’t match. Talk it through and try another.';return true;
}
function select(s,id){
 const r=current(s);if(s.phase!=='play'||r.kind!=='connections'||!r.options.includes(id)||r.eliminated.includes(id)||r.confirmed.includes(id))return false;
 if(r.selected.includes(id))r.selected=r.selected.filter(x=>x!==id);
 else if(r.selected.length<3)r.selected.push(id);
 else{r.message='Three seats at this table. Unselect a country to swap it.';return false;}
 r.message='';return true;
}
function checkSet(s){
 const r=current(s);if(s.phase!=='play'||r.kind!=='connections')return false;
 if(r.selected.length!==3){r.message='Choose exactly three countries together.';return false;}
 const signature=[...r.selected].sort().join(',');
 if(r.submitted.includes(signature)){r.message='You already tried that trio. Swap a country and try again.';return false;}
 r.submitted.push(signature);const correct=r.selected.filter(id=>r.answers.includes(id)).length;
 if(correct===3)return settle(s,r,score(r));
 r.tries++;r.message=`${correct} of those 3 belong at this table. Swap a country and try again.`;return true;
}
function useFavour(s,kind,data){
 const r=current(s);const cost=kind==='president'?20:15;
 if(s.phase!=='play'||r.kind==='map'||r.favours[kind]||s.favours[kind]<cost)return false;
 if(kind==='president'&&r.tries===0)return false;
 if(!['host','allies','president'].includes(kind))return false;
 if(kind==='allies'){
  if(r.kind==='connections'){
   const id=r.answers.find(id=>!r.confirmed.includes(id));r.confirmed.push(id);
   if(!r.selected.includes(id)){if(r.selected.length===3)r.selected.pop();r.selected.push(id);}
  }else{
   const id=r.options.find(id=>id!==r.answer&&!r.eliminated.includes(id)&&!r.wrong.includes(id));
   if(!id)return false;r.eliminated.push(id);
  }
 }
 r.favours[kind]=true;s.favours[kind]-=cost;
 r.message=kind==='president'?'Washington gives you a second chance: one wrong attempt will not cost points.':kind==='allies'?'Your ally has marked one useful card.':'A local tip is now open below the puzzle.';
 return true;
}
function reveal(s){const r=current(s);if(s.phase!=='play'||r.kind==='map')return false;return settle(s,r,0,true);}
function advance(s){if(s.phase!=='result')return false;if(s.index===s.rounds.length-1){s.phase='summit';s.completedAt=s.completedAt||new Date().toISOString();}else{s.index++;s.phase='play';}return true;}
function historyEntry(s){return{seed:s.seed,hostId:s.hostId,tradeIds:s.rounds.filter(r=>r.kind==='exports'||r.kind==='partner').map(r=>r.target),ruleIds:s.rounds.filter(r=>r.kind==='connections').map(r=>r.ruleId),points:s.rounds.reduce((n,r)=>n+r.points,0),assisted:s.rounds.filter(r=>r.assisted).length,completedAt:s.completedAt,postcard:s.postcard};}
function validate(s,data){
 if(!s||s.version!==3||!Number.isInteger(s.seed)||!data.countries.some(c=>c.id===s.hostId)||!['play','result','summit'].includes(s.phase)||!Number.isInteger(s.index)||s.index<0||s.index>4||!Array.isArray(s.rounds)||s.rounds.length!==5||!s.favours)return false;
 if(!['host','allies','president'].every(k=>Number.isFinite(s.favours[k])&&s.favours[k]>=0&&s.favours[k]<=100))return false;
 return s.rounds.every(r=>r&&['map','exports','partner','connections'].includes(r.kind)&&Array.isArray(r.selected)&&Array.isArray(r.wrong)&&Array.isArray(r.eliminated)&&Array.isArray(r.confirmed)&&Array.isArray(r.submitted)&&r.favours&&Number.isInteger(r.tries)&&r.tries>=0&&Number.isInteger(r.clues)&&r.clues>=1&&r.clues<=5&&(r.kind==='connections'?data.rules.some(rule=>rule.id===r.ruleId)&&Array.isArray(r.answers)&&r.answers.length===3:Array.isArray(r.options)||r.kind==='map'));
}
const api={generate,current,distance,lockMap,answer,select,checkSet,useFavour,reveal,advance,historyEntry,validate};root.CircuitEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
