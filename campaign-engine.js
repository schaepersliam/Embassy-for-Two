(function(root) {
  'use strict';
  const labels = {president:'Presidential confidence',host:'Host-country trust',allies:'Allied confidence',tension:'Escalation'};
  const fresh = () => ({version:2,stage:'arrival',pending:null,clue:1,pin:null,arrival:null,navigation:null,meters:{president:60,host:55,allies:55,tension:35},flags:{},evidence:['detention','ministry','intercept'],leads:[],classifications:{},history:[],draft:{facts:'',uncertainty:'',reason:'',policy:'',attribution:''},review:null,feedback:null,residence:{note:'',ritual:''}});
  function finishNavigation(state,data) {
    if (state.stage!=='arrival' || !state.pin || !Number.isFinite(state.pin.lat) || !Number.isFinite(state.pin.lng) || Math.abs(state.pin.lat)>85 || Math.abs(state.pin.lng)>180) return false;
    const radians=x=>x*Math.PI/180;
    const h=Math.sin(radians(data.city.lat-state.pin.lat)/2)**2+Math.cos(radians(state.pin.lat))*Math.cos(radians(data.city.lat))*Math.sin(radians(data.city.lng-state.pin.lng)/2)**2;
    const km=6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
    const accuracy=Math.round(100*Math.exp(-km/500));
    const bonus=(data.clues.length-state.clue)*5;
    state.navigation={km,accuracy,bonus,total:accuracy+bonus,clues:state.clue};
    state.arrival=`Your pin was ${Math.round(km)} km from ${data.city.name}. Navigation score: ${accuracy+bonus} / 120.`;
    state.stage='arrival-result';
    return true;
  }
  const clamp = value => Math.min(100,Math.max(0,value));
  function effects(state, changes) {
    const actual = {};
    for (const [key,value] of Object.entries(changes)) {
      const before = state.meters[key]; state.meters[key] = clamp(before + value); actual[key] = state.meters[key] - before;
    }
    return actual;
  }
  function choose(state, option, next, extra) {
    const delta = effects(state,option.effects || {});
    Object.assign(state.flags,option.flags || {});
    state.history.push({title:option.title,detail:extra || option.reply,effects:delta});
    state.feedback = {title:option.title,text:extra || option.reply,cost:option.cost || '',effects:delta};
    state.pending = next; state.stage = 'consequence';
  }
  function investigate(state, id, data) {
    if (state.stage !== 'investigation' || state.leads.length >= 2 || state.leads.includes(id)) return false;
    const lead = data.leads.find(x=>x.id===id); if (!lead) return false;
    state.leads.push(id); state.evidence.push(lead.evidence);
    if (id === 'police' && !state.flags.channel) state.flags.limitedAccess = true;
    choose(state,lead,state.leads.length === 2 ? 'assessment' : 'investigation',id === 'police' && !state.flags.channel ? lead.blockedReply : null);
    return true;
  }
  function evidenceFor(state, id, data) {
    if (id === 'custody' && state.flags.limitedAccess) return {...data.evidence.custody,source:'Ministry · written response',text:'The ministry confirms in writing that both researchers remain in local police custody. Your officer was not allowed to inspect the register or arrange a visit.',why:'The ministry has confirmed current custody in writing. Conditions inside the station and future access are still unknown.'};
    return data.evidence[id];
  }
  function reviewBrief(state,data) {
    if (state.stage !== 'memo') return null;
    let correct = 0;
    const feedback = [];
    for (const id of state.evidence) {
      const item = evidenceFor(state,id,data), selected = state.classifications[id];
      if (selected === item.truth) correct++;
      else feedback.push({title:item.title,text:`You marked this ${selected || 'unassessed'}. The supported category is ${item.truth}. ${item.why}`});
    }
    const evidenceScore = Math.round(100 * correct / state.evidence.length);
    const attributionGood = state.draft.attribution === 'unknown';
    if (!attributionGood) feedback.push({title:'Responsibility is still unresolved',text:'None of your sources establish Soviet direction of the arrests or prove that the researchers were spying. A confident attribution goes beyond the available evidence.'});
    const credible = evidenceScore >= 60 && attributionGood;
    let changes = {president:credible ? 12 : -14,allies:credible ? 3 : -4};
    if (state.draft.policy === 'quiet') Object.assign(changes,{president:changes.president-3,host:8,tension:-8});
    if (state.draft.policy === 'joint') Object.assign(changes,{host:state.flags.coalition ? 2 : -3,allies:changes.allies+8,tension:4});
    if (state.draft.policy === 'pressure') Object.assign(changes,{president:changes.president+5,host:-12,tension:15});
    const delta = effects(state,changes);
    state.review = {evidenceScore,correct,total:state.evidence.length,attributionGood,credible,feedback,effects:delta};
    state.history.push({title:'Cable to the president',detail:`${data.policies.find(p=>p.id===state.draft.policy).title}. ${correct}/${state.evidence.length} evidence assessments supported.`,effects:delta});
    state.stage = 'response';
    return state.review;
  }
  function outcome(state) {
    const military = state.flags.finalChoice === 'escalate';
    const authorizes = military && state.meters.tension >= 65 && (!state.review.credible || state.meters.president >= 75);
    if (authorizes) return {kind:'danger',title:'A signal becomes a standoff.',release:false,text:'The president authorises an alert outside Austria. Moscow responds with a warning of its own. The researchers remain in custody as senior officials turn their attention to the confrontation. No war has begun, but the next chapter would start with fewer ways to step back.',lesson:'Military signalling amplified an unresolved detention case. The vehicle report was never verified before the request went forward.'};
    if (state.meters.host >= 45 && state.meters.tension < 60) return {kind:'calm',title:'Two seats on the morning flight.',release:true,text:'The researchers are released after questioning and a consular visit. The recording project is suspended pending a permit review. Your governments issue a carefully factual statement. There is no triumphant podium moment; there are two relieved people in the embassy car.',lesson:'Working access and a controlled public response left room for a face-saving release. Their release does not prove that every allegation was false.'};
    if (military) return {kind:'mixed',title:'The president holds the line.',release:false,text:'The president declines a military alert on the available evidence. Consular access is arranged, but release remains unresolved. Washington requests a fresh assessment before considering further action.',lesson:'Your recommendation met a presidential limit. Political confidence and escalation both shaped the response; they did not replace evidence.'};
    return {kind:'mixed',title:'Access, but no resolution yet.',release:false,text:'An embassy officer is admitted to see the researchers. Both are unharmed. Their release remains under negotiation, and the ministry insists on a formal permit review. Your approach has bought movement, with diplomatic work still to do.',lesson:'You secured access, but strained relationships or public pressure limited the space for an immediate agreement.'};
  }
  root.CampaignEngine = {fresh,finishNavigation,effects,choose,investigate,evidenceFor,reviewBrief,outcome,labels};
  if (typeof module !== 'undefined') module.exports = root.CampaignEngine;
})(typeof window !== 'undefined' ? window : globalThis);
