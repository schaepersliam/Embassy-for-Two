const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../circuit-data.js');
require('../circuit-additions.js');
require('../trade-modes.js');
require('../export-expansion.js');
require('../city-quiz.js');
require('../courier-data.js');
require('../city-guide.js');
require('../posting-clues.js');
const E=require('../circuit-engine.js');
const make=seed=>E.generate(seed,D);
function finishMap(s){const c=D.countries.find(c=>c.id===s.hostId);E.current(s).pin={lat:c.lat,lng:c.lng};assert.ok(E.lockMap(s,D));}
function solve(s){const r=E.current(s);if(r.kind==='map')finishMap(s);else if(r.kind==='quiz'){for(let i=0;i<5;i++){E.answerQuiz(s,D.quizQuestion(r.questions[i].id).answer,D);E.nextQuiz(s);}}else if(r.kind==='courier'){const m=D.courierMissions.find(m=>m.id===r.missionId);D.courierSolution(m).slice(1).forEach(id=>assert.ok(E.routeStep(s,id,D)));assert.ok(E.checkRoute(s,D));}else if(['connections','hidden'].includes(r.kind)){r.answers.forEach(id=>E.select(s,id));assert.ok(E.checkSet(s));}else if(r.kind==='partner'){D.pickFiveRows(r).forEach(m=>assert.ok(E.addPick(s,m[0],D)));assert.ok(E.lockPicks(s,D));}else assert.ok(E.answer(s,r.answer));}
test('data keeps real-valued five-product baskets and source provenance',()=>{
 assert.equal(D.countries.length,12);
 for(const c of D.countries){assert.equal(c.products.length,5);assert.equal(new Set(c.products.map(p=>p.code)).size,5);assert.ok(c.products.every(p=>p.value>0&&p.code.length===6));assert.ok(c.tradeSource.includes('/2023/'));assert.ok(c.geoSource.startsWith('https://data.un.org/'));assert.ok(D.partnerRegions[c.partner]);}
});
test('4,000 generated dispatches have valid unique options and exactly three true connections',()=>{
 for(let seed=1;seed<=4000;seed++){
  const s=make(seed);assert.ok(E.validate(s,D));assert.equal(s.rounds[0].kind,'map');assert.equal(new Set([s.hostId,...s.rounds.filter(r=>r.target).map(r=>r.target)]).size,3);
  for(const r of s.rounds.slice(1)){
   if(r.kind==='quiz'){assert.equal(r.questions.length,5);continue;}
   if(r.kind==='courier'){assert.ok(D.courierSolution(D.courierMissions.find(m=>m.id===r.missionId)));continue;}
   if(r.kind==='partner'){assert.equal(D.pickFiveRows(r).length,5);continue;}
   assert.equal(r.options.length,6);assert.equal(new Set(r.options).size,6);
   if(r.kind==='connections'){const rule=D.rules.find(g=>g.id===r.ruleId);assert.deepEqual(r.options.filter(id=>rule.test(D.countries.find(c=>c.id===id))).sort(),[...r.answers].sort());}
   else if(r.kind==='hidden'){const t=D.themes.find(t=>t.id===r.themeId);assert.deepEqual(r.options.filter(id=>t.fixed?t.fixed.includes(id):t.test(D.countries.find(c=>c.id===id))).sort(),[...r.answers].sort());}else {assert.ok(r.options.includes(r.answer));if(r.kind==='partner')assert.ok(!r.options.includes(D.countries.find(c=>c.id===r.target).name));}
  }
  assert.equal(s.rounds[4].kind,'quiz');
 }
});
test('generation is deterministic and completed hosts rotate through all twelve',()=>{
 assert.deepEqual(make(25),make(25));const history=[];
 for(let i=0;i<24;i++){const s=E.generate(i+1,D,history);s.completedAt='test';history.push(E.historyEntry(s));}
 assert.equal(new Set(history.slice(0,12).map(h=>h.hostId)).size,12);assert.equal(new Set(history.slice(12).map(h=>h.hostId)).size,12);
 for(let i=1;i<history.length;i++){assert.ok(history[i].tradeIds.every(id=>!history[i-1].tradeIds.includes(id)));assert.ok(history[i].ruleIds.every(id=>!history[i-1].ruleIds.includes(id)));}
});
test('map requires a valid pin, locks once, and treats an exact pin as spot on',()=>{
 const s=make(2);assert.equal(E.lockMap(s,D),false);const r=E.current(s);r.pin={lat:NaN,lng:5};assert.equal(E.lockMap(s,D),false);r.clues=3;finishMap(s);assert.equal(r.points,100);const before=JSON.stringify(s);assert.equal(E.lockMap(s,D),false);assert.equal(JSON.stringify(s),before);
});
test('misses, favours and their one-use costs have real effects',()=>{
 const s=make(6);finishMap(s);E.advance(s);const r=E.current(s);const wrong=r.options.find(id=>id!==r.answer);assert.ok(E.answer(s,wrong));assert.equal(r.tries,1);assert.equal(E.answer(s,wrong),false);assert.ok(E.useFavour(s,'president',D));assert.equal(s.favours.president,25);assert.equal(E.useFavour(s,'president',D),false);assert.ok(E.useFavour(s,'allies',D));assert.notEqual(r.eliminated[0],r.answer);assert.ok(E.answer(s,r.answer));assert.equal(r.points,100);
});
test('seating feedback, duplicate trios and confirmed hints stay consistent',()=>{
 const s=make(10);finishMap(s);E.advance(s);solve(s);E.advance(s);const r=E.current(s);assert.equal(r.kind,'hidden');assert.equal(E.checkSet(s),false);
 const wrong=r.options.filter(id=>!r.answers.includes(id));wrong.forEach(id=>E.select(s,id));assert.ok(E.checkSet(s));assert.equal(r.tries,1);assert.equal(E.checkSet(s),false);assert.equal(r.tries,1);assert.ok(E.useFavour(s,'allies',D));assert.equal(r.confirmed.length,1);assert.ok(r.answers.includes(r.confirmed[0]));assert.ok(r.selected.includes(r.confirmed[0]));assert.equal(r.selected.length,3);assert.equal(E.select(s,r.confirmed[0]),true);
});
test('reveals cannot strand a dispatch, and complete state survives JSON serialization',()=>{
 const s=make(90);finishMap(s);E.advance(s);while(s.phase!=='summit'){assert.ok(E.reveal(s));assert.equal(E.current(s).points,0);assert.ok(E.advance(s));}assert.equal(s.rounds.filter(r=>r.solved).length,5);assert.equal(E.historyEntry(s).assisted,4);assert.ok(E.validate(JSON.parse(JSON.stringify(s)),D));assert.equal(E.advance(s),false);
});
test('a clean cooperative circuit reaches a 500-point summit',()=>{
 const s=make(5);for(let i=0;i<5;i++){solve(s);assert.ok(E.advance(s));}assert.equal(s.phase,'summit');assert.equal(E.historyEntry(s).points,500);assert.ok(Object.values(s.favours).every(n=>n>=0&&n<=100));
});
function atRound(n,seed=52){const s=make(seed);while(s.index<n){solve(s);E.advance(s);}if(n===3)s.rounds[3].mode='markets';return s;}
test('hidden links open progressive clues only for distinct misses and cap at three',()=>{
 const s=atRound(2),r=E.current(s),bad=r.options.filter(id=>!r.answers.includes(id));r.selected=[...bad];E.checkSet(s);assert.equal(r.linkClues,1);E.checkSet(s);assert.equal(r.linkClues,1);
 for(const id of r.answers){r.selected=[id,bad[0],bad[1]];E.checkSet(s);}assert.equal(r.linkClues,3);assert.equal(r.tries,4);assert.match(r.message,/All three clues/);const trust=s.favours.host;assert.equal(E.useFavour(s,'host',D),false);assert.equal(s.favours.host,trust);
});
test('five markets normalize country entry, reject duplicates/self/invalid and reveal only on locking',()=>{
 const s=atRound(3),r=E.current(s),c=D.countries.find(c=>c.id===r.target);assert.equal(E.lockPicks(s,D),false);assert.equal(E.addPick(s,c.name,D),false);assert.equal(E.addPick(s,'Atlantis',D),false);
 const guesses=c.markets.slice(0,3).map(m=>m[0]);guesses.push(...D.marketNames.filter(n=>n!==c.name&&!c.markets.some(m=>m[0]===n)).slice(0,2));
 for(const n of guesses)assert.ok(E.addPick(s,n,D));assert.equal(E.addPick(s,guesses[0],D),false);assert.equal(r.hits.length,0);assert.equal(s.phase,'play');assert.ok(E.validate(JSON.parse(JSON.stringify(s)),D));assert.ok(E.lockPicks(s,D));assert.equal(r.points,60);assert.equal(r.hits.length,3);assert.equal(E.lockPicks(s,D),false);
 assert.equal(D.normalizeCountry(' USA '),'United States');assert.equal(D.normalizeCountry('UK'),'United Kingdom');assert.equal(D.normalizeCountry('korea'),'South Korea');
});
test('market data has five unique ranked countries, and allies suggest only one',()=>{
 for(const c of D.countries.filter(c=>c.markets)){assert.equal(c.markets.length,5);assert.equal(new Set(c.markets.map(m=>m[0])).size,5);c.markets.forEach(([n,p],i)=>{assert.equal(D.normalizeCountry(n),n);assert.ok(p>0&&(!i||p<=c.markets[i-1][1]));});}
 const s=atRound(3),r=E.current(s);assert.ok(E.useFavour(s,'allies',D));assert.equal(r.picks.length,1);assert.ok(D.countries.find(c=>c.id===r.target).markets.some(m=>m[0]===r.picks[0]));assert.equal(E.useFavour(s,'allies',D),false);
});
test('previous saves retain completed rounds while upgrading unfinished puzzles',()=>{
 const s=atRound(2);delete s.features;s.rounds[2].kind='connections';s.rounds[2].ruleId=D.rules[0].id;s.rounds[3].target='AUS';const first=JSON.stringify(s.rounds.slice(0,2));E.upgrade(s,D);assert.equal(s.features,5);assert.equal(s.rounds[2].kind,'hidden');assert.ok(s.rounds[3].picks);assert.notEqual(s.rounds[3].target,'AUS');assert.equal(JSON.stringify(s.rounds.slice(0,2)),first);assert.ok(E.validate(s,D));
});
test('every city has a credited local photograph, activity links and a recipe',()=>{
 const fs=require('node:fs'),path=require('node:path'),photos=require('../city-photos.js');require('../city-guide.js');
 for(const c of D.countries){const g=globalThis.CityGuide[c.id],p=photos[c.id];assert.equal(g.activities.length,2);assert.ok(g.recipe.startsWith('https://'));assert.ok(g.dish&&g.recipeBy&&p.artist&&p.license&&p.source);assert.ok(fs.statSync(path.join(__dirname,'..',p.src)).size>10000);}
 const s=make(1);s.travelSaved=true;s.recipeSaved=true;assert.equal(E.historyEntry(s).travelSaved,true);assert.equal(E.historyEntry(s).recipeSaved,true);
});
test('map rewards near misses, gives full marks through 30 km, and has a five-point floor',()=>{
 for(const clues of [1,3,5]){assert.equal(E.mapScore(0,clues),100);assert.equal(E.mapScore(30,clues),100);assert.ok(E.mapScore(2385,clues)>=5);assert.equal(E.mapScore(20015,clues),5);}
 assert.ok(E.mapScore(2385)>20);assert.ok(E.mapScore(500)>E.mapScore(2385));assert.ok(E.mapScore(500,1)>E.mapScore(500,3));
});
test('reset clears all seats, keeps clues and penalties, and allows hinted seats to be picked again',()=>{
 const s=atRound(2),r=E.current(s);E.useFavour(s,'allies',D);const confirmed=r.confirmed[0];r.linkClues=2;r.tries=2;r.submitted=['test'];assert.ok(E.resetSelection(s));assert.deepEqual(r.selected,[]);assert.equal(r.linkClues,2);assert.equal(r.tries,2);assert.deepEqual(r.submitted,['test']);assert.ok(r.confirmed.includes(confirmed));assert.ok(E.select(s,confirmed));
});
test('all three trade modes are generated, avoid repeats, and can be solved with source answers',()=>{
 const seen=new Set();let previous=[];
 for(let seed=1;seed<=150;seed++){const s=E.generate(seed,D,previous),r=s.rounds[3];seen.add(r.mode);if(previous.length)assert.notEqual(r.mode,previous[0].tradeMode);s.index=3;const rows=D.pickFiveRows(r);assert.equal(rows.length,5);for(const row of rows)assert.ok(E.addPick(s,r.mode==='markets'?row[0]:row[2],D));assert.ok(E.lockPicks(s,D));assert.equal(r.points,100);previous=[E.historyEntry(s)];}
 assert.deepEqual([...seen].sort(),['export-goods','import-goods','markets']);
 for(const c of D.countries){assert.equal(c.imports.length,5);assert.equal(new Set(c.imports.map(p=>p.code)).size,5);c.imports.forEach((p,i)=>{assert.ok(p.value>0&&p.label);if(i)assert.ok(p.value<=c.imports[i-1].value);});}
});
test('new passport entries retain each score, the local plan, and the trade mode',()=>{
 const s=make(20);s.activityId=1;s.postcard='A local walk';s.rounds.forEach((r,i)=>r.points=i*20);const h=E.historyEntry(s);assert.deepEqual(h.roundScores,[0,20,40,60,80]);assert.equal(h.activityId,1);assert.equal(h.postcard,'A local walk');assert.ok(h.tradeMode);s.activityId=0;assert.equal(E.historyEntry(s).activityId,0);
});
test('all recipe cards have local dish photographs and credit metadata',()=>{
 const photos=require('../dish-photos.js'),fs=require('node:fs'),path=require('node:path');for(const c of D.countries){const p=photos[c.id];assert.ok(p.artist&&p.license&&p.source);assert.ok(fs.statSync(path.join(__dirname,'..',p.src)).size>5000);}
});
test('every host has five actionable posting clues without UN trivia',()=>{
 for(const c of D.countries){const clues=D.postingClues(c);assert.equal(clues.length,5);assert.ok(clues[0].length>90);assert.ok(!clues.some(s=>/United Nations|joined the UN/i.test(s)));assert.ok(clues[3].includes(c.city));assert.ok(clues[4].includes('°'));assert.ok(D.postingSources(c).length>=3);}
});
test('all courier missions have valid symmetric land borders and a solvable detour',()=>{
 for(const c of D.courierCountries)for(const id of c.neighbors)assert.ok(D.courierCountry(id).neighbors.includes(c.id));
 for(const m of D.courierMissions){const path=D.courierSolution(m);assert.ok(path);assert.equal(path[0],m.start);assert.equal(path.at(-1),m.end);assert.ok(path.includes(m.via));assert.ok(!path.includes(m.blocked));assert.equal(new Set(path).size,path.length);assert.ok(path.length-1<=m.budget);assert.ok(path.length>=4);}
});
test('courier invalid moves charge once, and undo and reset preserve penalties',()=>{
 const s=atCourierRound(),r=E.current(s),m=D.courierMissions.find(m=>m.id===r.missionId);assert.equal(E.routeStep(s,m.blocked,D),false);assert.equal(r.tries,1);E.routeStep(s,m.blocked,D);assert.equal(r.tries,1);const path=D.courierSolution(m);assert.ok(E.routeStep(s,path[1],D));assert.ok(E.undoRoute(s,D));assert.deepEqual(r.route,[m.start]);E.routeStep(s,path[1],D);E.undoRoute(s,D,true);assert.equal(r.tries,1);assert.deepEqual(r.route,[m.start]);assert.ok(E.useFavour(s,'allies',D));assert.ok(D.courierSolution(m,[m.start,r.suggested]));
});
test('courier delivery requires the pickup and accepts an alternate valid route',()=>{
 const s=atCourierRound(),r=E.current(s),m=D.courierMissions[6];r.missionId=m.id;r.route=['HR','SI','AT','DE','NL'];assert.equal(E.checkRoute(s,D),false);assert.equal(r.tries,1);r.route=['HR','SI','AT','CH','DE','NL'];assert.ok(E.checkRoute(s,D));assert.equal(r.points,85);assert.equal(E.checkRoute(s,D),false);
});
test('unfinished old final rounds upgrade to city trivia while completed rounds retain their scores',()=>{
 const s=atRound(4),legacy={...s.rounds[4],kind:'connections',ruleId:'eu',answers:['AUT','IRL','PRT'],options:['AUT','IRL','PRT','KEN','GHA','AUS']};s.features=3;s.rounds[4]=legacy;assert.ok(E.validate(s,D));E.upgrade(s,D);assert.equal(s.features,5);assert.equal(s.rounds[4].kind,'quiz');
 const done=make(3);done.features=3;done.rounds[4]={...legacy,solved:true,points:85};E.upgrade(done,D);assert.equal(done.rounds[4].kind,'connections');assert.equal(done.rounds[4].points,85);
});
test('active data copy uses American spelling',()=>{
 const strings=[...D.exportCountries.flatMap(c=>c.products.map(p=>p.label)),...D.goods.map(p=>p.label),...D.themes.flatMap(t=>[t.explain,...t.clues]),...Object.values(globalThis.CityGuide).flatMap(g=>[g.mood,g.dishText,...g.activities.flatMap(a=>a.slice(0,2))])];for(const text of strings)assert.doesNotMatch(text,/\b(harbour|colourful|favourite|cosy|neighbourhood|centre|organisation|travelling|travelled|defence|aluminium|tyres|petrol|flavouring|jewellery|tonnes)\b/i);
});
test('American spelling migration preserves petroleum and already entered guesses',()=>{
 const s=make(7);s.features=3;s.rounds[3].picks=['Refined petroleum products','Petrol cars, 1,500–3,000 cc','Unwrought aluminium alloys','Car tyres','Food & drink flavouring mixtures'];E.upgrade(s,D);assert.deepEqual(s.rounds[3].picks,['Refined petroleum products','Gasoline cars, 1,500–3,000 cc','Unwrought aluminum alloys','Car tires','Food & drink flavoring mixtures']);const before=JSON.stringify(s);E.upgrade(s,D);assert.equal(JSON.stringify(s),before);
});

function atCourierRound(){const s=atRound(4),m=D.courierMissions[0];Object.assign(s.rounds[4],{kind:'courier',missionId:m.id,route:[m.start]});return s;}
test('stage two has 36 sourced global profiles with five distinct HS6 products each',()=>{
 assert.equal(D.exportCountries.length,36);assert.equal(new Set(D.exportCountries.map(c=>c.id)).size,36);for(const c of D.exportCountries){assert.equal(c.products.length,5);assert.equal(new Set(c.products.map(p=>p.code)).size,5);assert.ok(c.products.every(p=>p.value>0&&p.label.length>2));assert.ok(c.tradeSource.includes('/2023/'));}for(const id of ['USA','BRA','JPN','IND','NGA','MAR','SAU','FRA'])assert.ok(D.exportCountries.some(c=>c.id===id));
});
test('export profiles rotate through all 36 even if dispatches are started without finishing',()=>{
 const exposure={targets:[],options:[]};const targets=[];
 for(let i=0;i<108;i++){const s=E.generate(700+i,D,[],exposure),r=s.rounds[1];targets.push(r.target);assert.equal(r.options.length,6);assert.equal(new Set(r.options).size,6);assert.ok(r.options.every(id=>D.exportCountries.some(c=>c.id===id)));const overlap=r.options.filter(id=>exposure.options.includes(id));assert.ok(overlap.every(id=>id===r.target));exposure.targets.push(r.target);exposure.options=[...exposure.options,...r.options].slice(-12);}
 for(let i=0;i<3;i++)assert.equal(new Set(targets.slice(i*36,(i+1)*36)).size,36);
});
test('every host has exactly five city questions with four unique answers and source links',()=>{
 for(const c of D.countries){assert.equal(D.cityQuiz[c.id].length,5);for(const q of D.cityQuiz[c.id]){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.options.includes(q.answer));assert.ok(q.explain.length>20);assert.ok(q.source.startsWith('https://'));}}
});
test('city quiz locks answers once, resumes feedback, and scores correct answers at 20 points',()=>{
 const s=atRound(4),r=E.current(s);assert.equal(r.kind,'quiz');assert.equal(E.nextQuiz(s),false);assert.equal(E.answerQuiz(s,'not an option',D),false);
 for(let i=0;i<5;i++){const q=D.quizQuestion(r.questions[i].id),choice=i<3?q.answer:i===3?q.options.find(a=>a!==q.answer):null;assert.ok(E.answerQuiz(s,choice,D));assert.equal(E.answerQuiz(s,q.answer,D),false);assert.ok(E.validate(JSON.parse(JSON.stringify(s)),D));assert.ok(E.nextQuiz(s));}
 assert.equal(s.phase,'result');assert.equal(r.points,60);assert.equal(r.responses.length,5);assert.equal(E.nextQuiz(s),false);assert.equal(E.answerQuiz(s,null,D),false);
});
test('unfinished courier rounds become city quizzes without changing the first four rounds',()=>{
 const s=atCourierRound();s.features=4;const before=JSON.stringify(s.rounds.slice(0,4));E.upgrade(s,D);assert.equal(s.rounds[4].kind,'quiz');assert.equal(s.rounds[4].hostId,s.hostId);assert.equal(JSON.stringify(s.rounds.slice(0,4)),before);
});
