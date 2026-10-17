const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../campaign-engine.js');
const D = require('../campaign-data.js');

function continueStory(s) { s.stage = s.pending; s.pending = null; }
function play(reception,leads,policy,final,accurate=true) {
  const s = E.fresh(); s.stage = 'reception';
  E.choose(s,D.reception.find(x=>x.id===reception),'investigation'); continueStory(s);
  for (const lead of leads) { assert.ok(E.investigate(s,lead,D)); continueStory(s); }
  assert.equal(s.stage,'assessment');
  for (const id of s.evidence) s.classifications[id] = accurate ? D.evidence[id].truth : 'plausible';
  s.draft = {facts:'Both researchers are detained.',uncertainty:'Their motive is not established.',reason:'We should get access before escalating.',policy,attribution:accurate?'unknown':'soviet'};
  s.stage = 'memo'; E.reviewBrief(s,D);
  s.stage = 'followup'; s.flags.finalChoice=final;
  E.choose(s,D.followups.find(x=>x.id===final),'ending'); continueStory(s);
  return s;
}
test('access depends on reception choice, and evidence changes with it',()=>{
  const privatePath=play('private',['police','translation'],'quiet','verify');
  const publicPath=play('public',['police','translation'],'quiet','verify');
  assert.match(E.evidenceFor(privatePath,'custody',D).text,/register/);
  assert.match(E.evidenceFor(publicPath,'custody',D).text,/not allowed/);
  assert.equal(privatePath.flags.limitedAccess,undefined);
  assert.equal(publicPath.flags.limitedAccess,true);
});
test('two-lead budget and duplicate protection do not consume extra resources',()=>{
  const s=E.fresh();s.stage='investigation';
  assert.equal(E.investigate(s,'missing',D),false);
  assert.ok(E.investigate(s,'archive',D));continueStory(s);
  const before=JSON.stringify(s);
  assert.equal(E.investigate(s,'archive',D),false);assert.equal(JSON.stringify(s),before);
  assert.ok(E.investigate(s,'police',D));continueStory(s);
  assert.equal(s.stage,'assessment');
  assert.equal(E.investigate(s,'translation',D),false);
  assert.equal(s.evidence.length,5);
});
test('a checked, private approach can release the researchers',()=>{
  const s=play('private',['police','translation'],'quiet','verify');
  assert.equal(s.review.evidenceScore,100);assert.equal(s.review.credible,true);
  assert.equal(E.outcome(s).release,true);
});
test('unsupported attribution and escalatory decisions can trigger a standoff',()=>{
  const s=play('public',['archive','reporter'],'pressure','escalate',false);
  assert.equal(s.review.credible,false);
  assert.equal(E.outcome(s).kind,'danger');
  assert.match(E.outcome(s).text,/No war has begun/);
});
test('reloading response state cannot apply cable effects twice',()=>{
  const s=play('private',['police','translation'],'quiet','verify');
  const restored=JSON.parse(JSON.stringify(s));restored.stage='response';
  const before=JSON.stringify(restored);
  assert.equal(E.reviewBrief(restored,D),null);
  assert.equal(JSON.stringify(restored),before);
});
test('all 648 major decision paths stay within meter bounds and reach an ending',()=>{
  const outcomes=new Set();let count=0;
  for(const reception of D.reception) for(const first of D.leads) for(const second of D.leads) {
    if(first.id===second.id)continue;
    for(const policy of D.policies)for(const final of D.followups)for(const accurate of [true,false]) {
      const s=play(reception.id,[first.id,second.id],policy.id,final.id,accurate);
      for(const value of Object.values(s.meters))assert.ok(value>=0&&value<=100);
      assert.equal(s.stage,'ending');outcomes.add(E.outcome(s).title);count++;
    }
  }
  assert.equal(count,648);assert.equal(outcomes.size,4);
});
