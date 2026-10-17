(function(root){
'use strict';
const clamp=n=>Math.max(0,Math.min(100,n));
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let v=Math.imul(t^(t>>>15),1|t);v^=v+Math.imul(v^(v>>>7),61|v);return((v^(v>>>14))>>>0)/4294967296;};}
function shuffle(items,random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function makeRound(kind,fields){return{kind,...fields,clues:1,pin:null,tries:0,wrong:[],selected:[],submitted:[],eliminated:[],confirmed:[],favours:{host:false,allies:false,president:false},message:'',solved:false,assisted:false,points:0};}
function generate(seed,data,history=[],exportExposure={}){
 const random=rng(seed),ids=data.countries.map(c=>c.id);
 const cycle=history.slice(Math.floor(history.length/ids.length)*ids.length).map(h=>h.hostId);
 const host=shuffle(ids.filter(id=>!cycle.includes(id)),random)[0];
 const recent=history.slice(-3).flatMap(h=>h.tradeIds||[]);
 let pool=ids.filter(id=>id!==host&&!recent.includes(id));
 if(pool.length<2)pool=ids.filter(id=>id!==host);
 const exportIds=data.exportCountries.map(c=>c.id),seen=exportExposure.targets||history.map(h=>h.exportTarget||h.tradeIds?.[0]).filter(Boolean);
 const counts=new Map(exportIds.map(id=>[id,seen.filter(x=>x===id).length]));const minimum=Math.min(...counts.values());const leastSeen=exportIds.filter(id=>counts.get(id)===minimum);
 const first=shuffle(leastSeen.filter(id=>id!==host).length?leastSeen.filter(id=>id!==host):leastSeen,random)[0];
 const modes=['markets','export-goods','import-goods'].filter(m=>m!==history.at(-1)?.tradeMode);
 const tradeMode=shuffle(modes,random)[0];
 const eligible=pool.filter(id=>id!==first&&(tradeMode!=='markets'||data.countries.find(c=>c.id===id).markets));
 const second=shuffle(eligible.length?eligible:ids.filter(id=>id!==host&&id!==first&&(tradeMode!=='markets'||data.countries.find(c=>c.id===id).markets)),random)[0];
 const trade=[first,second];
 const optionIds=target=>{const recentOptions=exportExposure.options||history.slice(-2).flatMap(h=>h.exportOptions||[]);const fresh=exportIds.filter(id=>id!==target&&!recentOptions.includes(id));const candidates=shuffle(fresh.length>=5?fresh:exportIds.filter(id=>id!==target),random);return shuffle([target,...candidates.slice(0,5)],random);};
 const hidden=makeHidden(seed,data,history,random);
 return{version:3,features:5,seed:seed>>>0,hostId:host,index:0,phase:'play',favours:{host:45,allies:45,president:45},rounds:[makeRound('map',{target:host}),makeRound('exports',{target:trade[0],answer:trade[0],options:optionIds(trade[0])}),hidden,makePickFive(trade[1],tradeMode),makeQuiz(host,data,random)],postcard:'',recipeSaved:false,completedAt:null};
}
function makeQuiz(hostId,data,random=rng(1)){
 const questions=shuffle(data.cityQuiz[hostId],random).slice(0,5).map(q=>({id:q.id,options:shuffle(q.options,random)}));return makeRound('quiz',{hostId,questions,quizIndex:0,responses:[],options:[]});
}
function answerQuiz(s,choice,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='quiz'||r.responses.length!==r.quizIndex)return false;const slot=r.questions[r.quizIndex],q=data.quizQuestion(slot.id);if(choice!==null&&!slot.options.includes(choice))return false;
 r.responses.push({questionId:q.id,choice,correct:choice===q.answer});r.message=choice===null?'Question skipped.':choice===q.answer?'Exactly right.':'A new fact for our next visit.';return true;
}
function nextQuiz(s){const r=current(s);if(s.phase!=='play'||r.kind!=='quiz'||r.responses.length!==r.quizIndex+1)return false;if(r.quizIndex===4)return settle(s,r,r.responses.filter(a=>a.correct).length*20);r.quizIndex++;r.message='';return true;}
function makePickFive(target,mode='markets'){return makeRound('partner',{target,mode,options:[],picks:[],hits:[]});}
function makeHidden(seed,data,history=[],random=rng(seed^0xABCDEF)){
 const recent=history.slice(-1).flatMap(h=>h.ruleIds||[]);
 const themes=data.themes.filter(t=>!recent.includes(t.id));
 const theme=shuffle(themes.length?themes:data.themes,random)[0];
 const answers=theme.fixed?[...theme.fixed]:shuffle(data.countries.filter(theme.test),random).slice(0,3).map(c=>c.id);
 const no=data.countries.filter(c=>theme.fixed?!answers.includes(c.id):!theme.test(c));
 return makeRound('hidden',{themeId:theme.id,linkClues:0,answers,options:shuffle([...answers,...shuffle(no,random).slice(0,3).map(c=>c.id)],random)});
}
function makeCourier(seed,data,history=[],random=rng(seed^0xC0FFEE)){
 const recent=history.slice(-3).map(h=>h.courierId);const pool=data.courierMissions.filter(m=>!recent.includes(m.id));const mission=shuffle(pool.length?pool:data.courierMissions,random)[0];return makeRound('courier',{missionId:mission.id,route:[mission.start],options:[]});
}
function upgrade(s,data){
 if(s.features<2||!s.features){
  if(!s.rounds[2].solved)s.rounds[2]=makeHidden(s.seed,data);
  if(!s.rounds[3].solved){const old=s.rounds[3].target;const target=data.countries.find(c=>c.id===old&&c.markets)||data.countries.find(c=>c.markets&&c.id!==s.hostId&&c.id!==s.rounds[1].target);s.rounds[3]=makePickFive(target.id);}
 }
 s.rounds[3].mode=s.rounds[3].mode||'markets';
 for(const key of ['picks','hits','confirmed'])if(s.rounds[3][key])s.rounds[3][key]=s.rounds[3][key].map(value=>String(value).replace(/\bPetrol\b/g,'Gasoline').replace(/\bpetrol\b/g,'gasoline').replace(/\baluminium\b/g,'aluminum').replace(/\btyres\b/g,'tires').replace(/\bflavouring\b/g,'flavoring').replace(/\bjewellery\b/g,'jewelry').replace(/\btonnes\b/g,'metric tons'));
 if(s.features!==5&&!s.rounds[4].solved)s.rounds[4]=makeQuiz(s.hostId,data,rng(s.seed^0x51A7));
 if(s.features!==5&&!s.rounds[1].solved&&s.rounds[1].tries===0&&!s.rounds[1].selected.length&&!Object.values(s.rounds[1].favours).some(Boolean)){const r=s.rounds[1],random=rng(s.seed^0xB045D);r.options=shuffle([r.target,...shuffle(data.exportCountries.filter(c=>c.id!==r.target&&!r.options.includes(c.id)),random).slice(0,5).map(c=>c.id)],random);r.selected=[];}
 s.features=5;s.recipeSaved=s.recipeSaved||false;return s;
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
 if(!name){r.message=goods?'Choose a product from the suggestions, or enter its six-digit HS code.':'Choose a recognized country from the search suggestions.';return false;}
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
function courierMiss(r,signature,message){
 if(!r.submitted.includes(signature)){r.submitted.push(signature);r.tries++;r.message=message+' That costs 15 points.';}else r.message=message+' You already tried this; no extra penalty.';return false;
}
function routeStep(s,id,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='courier'||!data.courierCountry(id))return false;const m=data.courierMissions.find(m=>m.id===r.missionId),last=r.route.at(-1),sig=r.route.join(',')+'>'+id;
 if(id===m.blocked)return courierMiss(r,sig,'The courier cannot enter that country in this scenario.');
 if(r.route.includes(id)){r.message='That country is already in your route. Undo a stop to backtrack.';return false;}
 if(!data.courierCountry(last).neighbors.includes(id))return courierMiss(r,sig,'Those countries do not share a land border on this board.');
 if(r.route.length-1>=m.budget){r.message='The crossing budget is full. Undo a stop, or reset the route.';return false;}
 r.route.push(id);r.message=id===m.end?'At the destination. Check your required stop, then deliver the pouch.':'';return true;
}
function undoRoute(s,data,reset=false){const r=current(s);if(s.phase!=='play'||r.kind!=='courier')return false;if(reset)r.route=[data.courierMissions.find(m=>m.id===r.missionId).start];else if(r.route.length>1)r.route.pop();r.message='Route updated. Your previous penalties still apply.';return true;}
function checkRoute(s,data){
 const r=current(s);if(s.phase!=='play'||r.kind!=='courier')return false;const m=data.courierMissions.find(m=>m.id===r.missionId);
 if(!data.courierPathValid(m,r.route)){r.message='That route does not satisfy the board rules. Reset the route to try again.';return false;}
 if(r.route.at(-1)!==m.end){r.message='Reach the destination before sending the pouch.';return false;}
 if(!r.route.includes(m.via))return courierMiss(r,'deliver:'+r.route.join(','),'You skipped the required pickup.');
 if(r.route.length-1>m.budget)return false;
 return settle(s,r,score(r));
}
function useFavour(s,kind,data){
 const r=current(s);const cost=kind==='president'?20:15;
 if(s.phase!=='play'||['map','quiz'].includes(r.kind)||r.favours[kind]||s.favours[kind]<cost)return false;
 if(kind==='president'&&r.tries===0)return false;
 if(!['host','allies','president'].includes(kind))return false;
 if(kind==='host'&&r.kind==='hidden'&&r.linkClues>=3)return false;
 if(kind==='host'&&r.kind==='hidden')r.linkClues=Math.min(3,r.linkClues+1);
 if(r.kind==='courier'&&kind==='allies'){const m=data.courierMissions.find(m=>m.id===r.missionId),path=data.courierSolution(m,r.route);if(!path||path.length===r.route.length){r.message=path?'You are already at the destination. Deliver the pouch.':'This route cannot finish within budget. Undo a stop, then ask again.';return false;}r.suggested=path[r.route.length];}
 if(kind==='allies'&&r.kind!=='courier'){
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
 r.message=kind==='president'?'Washington gives you a second chance: one wrong attempt will not cost points.':kind==='allies'?(r.kind==='courier'?'Your ally marked a next stop that keeps a valid route open.':r.kind==='partner'?'Your ally suggested one of the true top five.':'Your ally has marked one useful card.'):'A local tip is now open below the puzzle.';
 return true;
}
function reveal(s){const r=current(s);if(s.phase!=='play'||r.kind==='map')return false;return settle(s,r,r.kind==='quiz'?r.responses.filter(a=>a.correct).length*20:0,true);}
function advance(s){if(s.phase!=='result')return false;if(s.index===s.rounds.length-1){s.phase='summit';s.completedAt=s.completedAt||new Date().toISOString();}else{s.index++;s.phase='play';}return true;}
function historyEntry(s){return{seed:s.seed,hostId:s.hostId,exportTarget:s.rounds[1].target,exportOptions:s.rounds[1].options,finalKind:s.rounds[4].kind,tradeIds:s.rounds.filter(r=>r.kind==='exports'||r.kind==='partner').map(r=>r.target),ruleIds:s.rounds.filter(r=>['connections','hidden'].includes(r.kind)).map(r=>r.ruleId||r.themeId),points:s.rounds.reduce((n,r)=>n+r.points,0),assisted:s.rounds.filter(r=>r.assisted).length,completedAt:s.completedAt,postcard:s.postcard,activityId:s.activityId??null,courierId:s.rounds[4].missionId||null,tradeMode:s.rounds[3].mode||'markets',roundScores:s.rounds.map(r=>r.points),recipeSaved:!!s.recipeSaved,travelSaved:!!s.travelSaved};}
function validQuiz(r,s,data){
 if(r.hostId!==s.hostId||!Array.isArray(r.questions)||r.questions.length!==5||new Set(r.questions.map(q=>q.id)).size!==5||!Number.isInteger(r.quizIndex)||r.quizIndex<0||r.quizIndex>4||!Array.isArray(r.responses)||![r.quizIndex,r.quizIndex+1].includes(r.responses.length))return false;
 if(!r.questions.every(slot=>{const q=data.cityQuiz[s.hostId].find(q=>q.id===slot.id);return q&&Array.isArray(slot.options)&&slot.options.length===4&&new Set(slot.options).size===4&&slot.options.every(a=>q.options.includes(a));}))return false;
 return r.responses.every((a,i)=>{const slot=r.questions[i],q=data.quizQuestion(slot.id);return a.questionId===slot.id&&(a.choice===null||slot.options.includes(a.choice))&&a.correct===(a.choice===q.answer);});
}
function validate(s,data){
 if(!s||s.version!==3||!Number.isInteger(s.seed)||!data.countries.some(c=>c.id===s.hostId)||!['play','result','summit'].includes(s.phase)||!Number.isInteger(s.index)||s.index<0||s.index>4||!Array.isArray(s.rounds)||s.rounds.length!==5||!s.favours)return false;
 if(!['host','allies','president'].every(k=>Number.isFinite(s.favours[k])&&s.favours[k]>=0&&s.favours[k]<=100))return false;
 return s.rounds.every(r=>r&&['map','exports','partner','connections','hidden','courier','quiz'].includes(r.kind)&&Array.isArray(r.selected)&&Array.isArray(r.wrong)&&Array.isArray(r.eliminated)&&Array.isArray(r.confirmed)&&Array.isArray(r.submitted)&&r.favours&&Number.isInteger(r.tries)&&r.tries>=0&&Number.isInteger(r.clues)&&r.clues>=1&&r.clues<=5&&(r.kind==='quiz'?validQuiz(r,s,data):r.kind==='courier'?data.courierMissions.some(m=>m.id===r.missionId&&data.courierPathValid(m,r.route)):r.kind==='hidden'?data.themes.some(t=>t.id===r.themeId)&&Array.isArray(r.answers)&&r.answers.length===3:r.kind==='connections'?data.rules.some(rule=>rule.id===r.ruleId)&&Array.isArray(r.answers)&&r.answers.length===3:Array.isArray(r.options)||r.kind==='map'));
}
const api={answerQuiz,nextQuiz,routeStep,undoRoute,checkRoute,mapScore,resetSelection,generate,upgrade,current,distance,lockMap,answer,select,checkSet,addPick,lockPicks,useFavour,reveal,advance,historyEntry,validate};root.CircuitEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
