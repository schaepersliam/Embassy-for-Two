const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../circuit-data.js');
require('../circuit-additions.js');
const E=require('../circuit-engine.js');
const make=seed=>E.generate(seed,D);
function finishMap(s){const c=D.countries.find(c=>c.id===s.hostId);E.current(s).pin={lat:c.lat,lng:c.lng};assert.ok(E.lockMap(s,D));}
function solve(s){const r=E.current(s);if(r.kind==='map')finishMap(s);else if(['connections','hidden'].includes(r.kind)){r.answers.forEach(id=>E.select(s,id));assert.ok(E.checkSet(s));}else if(r.kind==='partner'){D.countries.find(c=>c.id===r.target).markets.forEach(m=>assert.ok(E.addPick(s,m[0],D)));assert.ok(E.lockPicks(s,D));}else assert.ok(E.answer(s,r.answer));}
test('data keeps real-valued five-product baskets and source provenance',()=>{
 assert.equal(D.countries.length,12);
 for(const c of D.countries){assert.equal(c.products.length,5);assert.equal(new Set(c.products.map(p=>p.code)).size,5);assert.ok(c.products.every(p=>p.value>0&&p.code.length===6));assert.ok(c.tradeSource.includes('/2023/'));assert.ok(c.geoSource.startsWith('https://data.un.org/'));assert.ok(D.partnerRegions[c.partner]);}
});
test('4,000 generated dispatches have valid unique options and exactly three true connections',()=>{
 for(let seed=1;seed<=4000;seed++){
  const s=make(seed);assert.ok(E.validate(s,D));assert.equal(s.rounds[0].kind,'map');assert.equal(new Set([s.hostId,...s.rounds.filter(r=>r.target).map(r=>r.target)]).size,3);
  for(const r of s.rounds.slice(1)){
   if(r.kind==='partner'){assert.equal(D.countries.find(c=>c.id===r.target).markets.length,5);continue;}
   assert.equal(r.options.length,6);assert.equal(new Set(r.options).size,6);
   if(r.kind==='connections'){const rule=D.rules.find(g=>g.id===r.ruleId);assert.deepEqual(r.options.filter(id=>rule.test(D.countries.find(c=>c.id===id))).sort(),[...r.answers].sort());}
   else if(r.kind==='hidden'){const t=D.themes.find(t=>t.id===r.themeId);assert.deepEqual(r.options.filter(id=>t.fixed?t.fixed.includes(id):t.test(D.countries.find(c=>c.id===id))).sort(),[...r.answers].sort());}else {assert.ok(r.options.includes(r.answer));if(r.kind==='partner')assert.ok(!r.options.includes(D.countries.find(c=>c.id===r.target).name));}
  }
  assert.notEqual(s.rounds[2].ruleId,s.rounds[4].ruleId);
 }
});
test('generation is deterministic and completed hosts rotate through all twelve',()=>{
 assert.deepEqual(make(25),make(25));const history=[];
 for(let i=0;i<24;i++){const s=E.generate(i+1,D,history);s.completedAt='test';history.push(E.historyEntry(s));}
 assert.equal(new Set(history.slice(0,12).map(h=>h.hostId)).size,12);assert.equal(new Set(history.slice(12).map(h=>h.hostId)).size,12);
 for(let i=1;i<history.length;i++){assert.ok(history[i].tradeIds.every(id=>!history[i-1].tradeIds.includes(id)));assert.ok(history[i].ruleIds.every(id=>!history[i-1].ruleIds.includes(id)));}
});
test('map requires a valid pin, locks once and deducts extra clues',()=>{
 const s=make(2);assert.equal(E.lockMap(s,D),false);const r=E.current(s);r.pin={lat:NaN,lng:5};assert.equal(E.lockMap(s,D),false);r.clues=3;finishMap(s);assert.equal(r.points,90);const before=JSON.stringify(s);assert.equal(E.lockMap(s,D),false);assert.equal(JSON.stringify(s),before);
});
test('misses, favours and their one-use costs have real effects',()=>{
 const s=make(6);finishMap(s);E.advance(s);const r=E.current(s);const wrong=r.options.find(id=>id!==r.answer);assert.ok(E.answer(s,wrong));assert.equal(r.tries,1);assert.equal(E.answer(s,wrong),false);assert.ok(E.useFavour(s,'president',D));assert.equal(s.favours.president,25);assert.equal(E.useFavour(s,'president',D),false);assert.ok(E.useFavour(s,'allies',D));assert.notEqual(r.eliminated[0],r.answer);assert.ok(E.answer(s,r.answer));assert.equal(r.points,100);
});
test('seating feedback, duplicate trios and confirmed hints stay consistent',()=>{
 const s=make(10);finishMap(s);E.advance(s);solve(s);E.advance(s);const r=E.current(s);assert.equal(r.kind,'hidden');assert.equal(E.checkSet(s),false);
 const wrong=r.options.filter(id=>!r.answers.includes(id));wrong.forEach(id=>E.select(s,id));assert.ok(E.checkSet(s));assert.equal(r.tries,1);assert.equal(E.checkSet(s),false);assert.equal(r.tries,1);assert.ok(E.useFavour(s,'allies',D));assert.equal(r.confirmed.length,1);assert.ok(r.answers.includes(r.confirmed[0]));assert.ok(r.selected.includes(r.confirmed[0]));assert.equal(r.selected.length,3);assert.equal(E.select(s,r.confirmed[0]),false);
});
test('reveals cannot strand a dispatch, and complete state survives JSON serialization',()=>{
 const s=make(90);finishMap(s);E.advance(s);while(s.phase!=='summit'){assert.ok(E.reveal(s));assert.equal(E.current(s).points,0);assert.ok(E.advance(s));}assert.equal(s.rounds.filter(r=>r.solved).length,5);assert.equal(E.historyEntry(s).assisted,4);assert.ok(E.validate(JSON.parse(JSON.stringify(s)),D));assert.equal(E.advance(s),false);
});
test('a clean cooperative circuit reaches a 500-point summit',()=>{
 const s=make(5);for(let i=0;i<5;i++){solve(s);assert.ok(E.advance(s));}assert.equal(s.phase,'summit');assert.equal(E.historyEntry(s).points,500);assert.ok(Object.values(s.favours).every(n=>n>=0&&n<=100));
});
function atRound(n,seed=52){const s=make(seed);while(s.index<n){solve(s);E.advance(s);}return s;}
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
 const s=atRound(2);delete s.features;s.rounds[2].kind='connections';s.rounds[2].ruleId=D.rules[0].id;s.rounds[3].target='AUS';const first=JSON.stringify(s.rounds.slice(0,2));E.upgrade(s,D);assert.equal(s.features,2);assert.equal(s.rounds[2].kind,'hidden');assert.ok(s.rounds[3].picks);assert.notEqual(s.rounds[3].target,'AUS');assert.equal(JSON.stringify(s.rounds.slice(0,2)),first);assert.ok(E.validate(s,D));
});
test('every city has a credited local photograph, activity links and a recipe',()=>{
 const fs=require('node:fs'),path=require('node:path'),photos=require('../city-photos.js');require('../city-guide.js');
 for(const c of D.countries){const g=globalThis.CityGuide[c.id],p=photos[c.id];assert.equal(g.activities.length,2);assert.ok(g.recipe.startsWith('https://'));assert.ok(g.dish&&g.recipeBy&&p.artist&&p.license&&p.source);assert.ok(fs.statSync(path.join(__dirname,'..',p.src)).size>10000);}
 const s=make(1);s.travelSaved=true;s.recipeSaved=true;assert.equal(E.historyEntry(s).travelSaved,true);assert.equal(E.historyEntry(s).recipeSaved,true);
});
