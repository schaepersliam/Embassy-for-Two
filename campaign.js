'use strict';
const $ = id => document.getElementById(id);
const D = window.CampaignData, E = window.CampaignEngine;
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey = new URLSearchParams(location.search).has('playtest') ? 'embassy-campaign-v2-playtest' : 'embassy-campaign-v2';
const stages = ['welcome','arrival','arrival-result','briefing','reception','investigation','assessment','memo','response','followup','ending','residence','complete','consequence'];
let state = E.fresh(), deskTab = 'evidence', map = null, navigationView = null;
try {
  const restored = JSON.parse(localStorage.getItem(storageKey));
  if (restored && restored.version === 2 && stages.includes(restored.stage) && restored.meters && restored.draft && Array.isArray(restored.history) && Array.isArray(restored.evidence) && restored.evidence.every(id=>D.evidence[id]) && ['president','host','allies','tension'].every(key=>Number.isFinite(restored.meters[key]) && restored.meters[key]>=0 && restored.meters[key]<=100)) state = restored;
} catch { /* An unavailable browser store does not block play. */ }
// Old saves that have not started their posting now open on the map as well.
if (state.stage==='welcome' && !state.arrival) state.stage='arrival';
function save() {
  try { localStorage.setItem(storageKey,JSON.stringify(state)); $('autosave').textContent = '✓ Saved in this browser · Resume whenever you like'; }
  catch { $('autosave').textContent = 'Storage unavailable · Keep this tab open; use Download at the end.'; }
}
function go(stage) { state.stage = stage; save(); render(); $('scene').focus({preventScroll:true}); $('chapter-progress').scrollIntoView({behavior:'instant',block:'start'}); }
function button(text, action, secondary=false) { return `<button class="${secondary?'secondary':'primary'}" data-action="${action}">${text}</button>`; }
function heading(kicker,title) {return `<p class="eyebrow">${kicker}</p><h2>${title}</h2>`;}
function telegram(from,text) {return `<div class="telegram"><p class="eyebrow">${from}</p><p>${text}</p></div>`;}
function chips(changes) {
  return `<div class="effect-chips">${Object.entries(changes).filter(([,v])=>v!==0).map(([key,value])=>`<span class="effect-chip ${(key==='tension'?value>0:value<0)?'bad':''}">${esc(E.labels[key])} ${value>0?'+':''}${value}</span>`).join('')}</div>`;
}
function choices(list,action) {
  return `<div class="choice-stack">${list.map(item=>`<button class="story-choice" data-${action}="${item.id}" ${action==='lead' && state.leads.includes(item.id)?'disabled':''}>${item.tag?`<em>${esc(item.tag)}</em>`:''}<strong>${esc(item.title)}${action==='lead' && state.leads.includes(item.id)?' ✓':''}</strong><span>${esc(item.text)}</span>${item.line?`<span><i>${esc(item.line)}</i></span>`:''}</button>`).join('')}</div>`;
}
function renderMeters() {
  $('meters').innerHTML = Object.entries(state.meters).map(([key,value])=>{
    const tension = key==='tension';
    const status = tension ? value>=65?'Dangerous':value>=40?'Uneasy':'Contained' : value>=70?'Strong':value>=40?'Working relationship':'Strained';
    return `<div class="meter-row"><div class="meter-label"><span>${E.labels[key]}</span><strong>${value} / 100</strong></div><div class="meter-track" role="meter" aria-label="${E.labels[key]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><div class="meter-fill ${tension?'escalation':''} ${tension&&value>=65?'hot':!tension&&value<40?'low':''}" style="width:${value}%"></div></div><p class="small">${status}</p></div>`;
  }).join('');
}
function renderDesk() {
  $('evidence-count').textContent = ['welcome','arrival'].includes(state.stage)?0:state.evidence.length;
  $('evidence-tab').setAttribute('aria-pressed',String(deskTab==='evidence'));
  $('journal-tab').setAttribute('aria-pressed',String(deskTab==='journal'));
  if (deskTab==='journal') {
    $('desk-content').innerHTML = state.history.length ? state.history.map(item=>`<article class="log-item"><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p>${chips(item.effects)}</article>`).join('') : '<p class="small">Your decisions will leave a paper trail here.</p>';
  } else {
    $('desk-content').innerHTML = ['welcome','arrival'].includes(state.stage) ? '<p class="small">The diplomatic bag is sealed until you arrive.</p>' : state.evidence.map(id=>{
      const item = E.evidenceFor(state,id,D);
      return `<details class="evidence-card"><summary>${esc(item.title)}</summary><p><strong>${esc(item.source)}</strong></p><p>${esc(item.text)}</p></details>`;
    }).join('');
  }
}
function renderProgress() {
  const groups = [['Find the city',['arrival','arrival-result']],['Briefing',['welcome','briefing']],['Reception',['reception']],['Investigate',['investigation','assessment']],['The cable',['memo','response']],['Aftermath',['followup','ending','residence','complete']]];
  const current = state.stage==='consequence' ? state.pending : state.stage;
  const index = groups.findIndex(([,items])=>items.includes(current));
  $('chapter-progress').innerHTML = groups.map(([label],i)=>`<span class="${i===index?'active':i<index?'done':''}" ${i===index?'aria-current="step"':''}>${String(i+1).padStart(2,'0')} ${label}</span>`).join('');
}
const assessmentClaims = {
  detention:'Two Americans are currently detained by Austrian police.',
  ministry:'The researchers photographed a restricted installation.',
  intercept:'The intercept establishes a foreign operation to transfer the researchers.',
  permit:'The researchers’ permit excluded government transmission facilities.',
  witness:'The researchers were seen near an ordinary relay building.',
  custody:'The researchers are still in local police custody.',
  translation:'The intercepted message concerns radio valves, not prisoners.'
};
function render() {
  if (map) { navigationView={center:map.getCenter(),zoom:map.getZoom()}; map.remove(); map = null; }
  const navigating=['arrival','arrival-result'].includes(state.stage);
  document.querySelector('.campaign-layout').classList.toggle('mapping',navigating);
  document.querySelector('.desk-sidebar').hidden=navigating;
  renderMeters(); renderDesk(); renderProgress();
  const scene = $('scene'); scene.tabIndex = -1; scene.setAttribute('aria-label','Current scene');
  switch(state.stage) {
    case 'welcome':
      scene.innerHTML = heading('CHAPTER ONE / THE MISSING RESEARCHERS','A quiet capital.<br>A very loud telephone.') + '<span class="story-kicker">EYES ONLY / TWO PAIRS</span><p class="lead">You have barely unpacked at the residence when two Americans are detained. A reception starts in an hour. Washington wants answers before morning.</p><p>You are an ambassador couple working as a diplomatic team. Read the room, test the intelligence, and decide what the president hears.</p><div class="roles"><div><strong>One of you: Ambassador</strong><p>Ask what each decision does to your relationships and your room to negotiate.</p></div><div><strong>The other: Political counsellor</strong><p>Ask what the evidence supports, what is missing, and who benefits from each account.</p></div></div><p class="small">Choose roles aloud, swap whenever you like. One person clicks and types for both. No private choices or timers. Allow about 20–30 minutes, or move quickly for a test.</p><div class="scene-actions">'+button('Open the diplomatic bag →','briefing')+'</div>';
      break;
    case 'arrival': case 'arrival-result': renderArrival(); break;
    case 'briefing':
      scene.innerHTML = heading('18:00 / VIENNA, AUSTRIA','The diplomatic bag.') + (state.arrival?`<p class="small">${esc(state.arrival)}</p>`:'') + '<p class="lead">A neutral country. A city where East and West both want to be heard. Tonight, everyone seems to be speaking at once.</p>' + telegram('CABLE / FROM THE PRESIDENT · FICTIONAL','“Protect our citizens. Find out whether this is an ordinary arrest or something larger. I want a recommendation, not a stack of rumours. I also expect our allies to see that we mean business.”') + '<p>Two American acoustics researchers were detained this afternoon. The ministry alleges they photographed a restricted installation. An allied intercept hints at a transfer before morning.</p><p><strong>Your objectives:</strong> establish the facts, secure consular access, and prevent an avoidable confrontation. Keeping every relationship happy may be impossible.</p><p>Open the three evidence cards on your desk. Then decide how to handle the reception.</p><div class="scene-actions">'+button('Go to the reception →','reception')+'</div>';
      break;
    case 'reception':
      scene.innerHTML = heading('19:15 / A FOREIGN MINISTRY RECEPTION','The first conversation matters.') + '<p class="lead">Glasses clink. A quartet plays in the next room. The deputy minister catches your eye, then looks towards the journalists.</p>' + telegram('DEPUTY MINISTER ELISABETH KERN · FICTIONAL','“I hope your government will allow our police to do their work. There is no need to turn an unfortunate incident into an international performance.”') + '<p>Your allied counterpart is nearby. Washington is expecting a firm response. You have one opening.</p>'+choices(D.reception,'reception')+'<p class="small">Talk through your choice together. The consequences appear after you commit.</p>';
      break;
    case 'consequence':
      scene.innerHTML = heading('THE ROOM RESPONDS',esc(state.feedback.title)) + `<div class="consequence"><p class="lead">${esc(state.feedback.text)}</p>${state.feedback.cost?`<p>${esc(state.feedback.cost)}</p>`:''}${chips(state.feedback.effects)}</div><p class="small">The meters record consequences, not a moral score. You can still change course.</p><div class="scene-actions">${button('Continue the evening →','continue')}</div>`;
      break;
    case 'investigation':
      scene.innerHTML = heading('20:30 / TWO CALLS BEFORE THE DEADLINE','Which leads do you trust?') + `<p class="lead">You have time to pursue ${2-state.leads.length} more ${state.leads.length?'lead':'leads'} before Washington expects your cable.</p><p>Every source gives you a different piece of the picture. You cannot chase everything tonight.</p>`+choices(D.leads,'lead')+'<p class="small">New documents appear on your desk. Earlier conversations can affect what access you get.</p>';
      break;
    case 'assessment':
      scene.innerHTML = heading('22:00 / SEPARATE FACT FROM INFERENCE','What can you actually say?') + '<p>Before writing, assess these specific claims together. Use the evidence on your desk.</p><p class="small"><strong>Confirmed:</strong> directly documented. <strong>Plausible:</strong> some relevant support, incomplete corroboration. <strong>Unverified:</strong> an allegation or inference not established by the available material. These labels apply to the claims below, not to whether a document exists.</p>' + state.evidence.map(id=>`<div class="assessment-row"><label for="assess-${id}"><strong>${esc(assessmentClaims[id])}</strong></label><p class="small">Source: ${esc(E.evidenceFor(state,id,D).title)}</p><select id="assess-${id}" data-assess="${id}"><option value="">Discuss and choose…</option>${['confirmed','plausible','unverified'].map(value=>`<option value="${value}" ${state.classifications[id]===value?'selected':''}>${value[0].toUpperCase()+value.slice(1)}</option>`).join('')}</select></div>`).join('') + '<p id="validation" class="validation" role="status"></p><div class="scene-actions">'+button('Draft our cable →','memo')+'</div>';
      break;
    case 'memo': renderMemo(); break;
    case 'response': renderResponse(); break;
    case 'followup':
      scene.innerHTML = heading('00:20 / THE TELEPHONE RINGS AGAIN','A van in the courtyard.') + telegram('DUTY OFFICER','“A local contact says a covered van has arrived at the station. They think the Americans may be moved. We have not confirmed the occupants or the destination.”') + `<p>${state.leads.includes('translation')?'You have already seen what an ambiguous reference to a “transfer” can do. This is a new report, and needs its own assessment.':'The earlier intercept mentioned a transfer. This new report may look like corroboration, but nobody has confirmed what is inside the van.'}</p><p>The president’s office asks whether this changes your recommendation. Your next call may shape the morning.</p>`+choices(D.followups,'final');
      break;
    case 'ending': renderEnding(); break;
    case 'residence': renderResidence(); break;
    case 'complete':
      scene.innerHTML = heading('CHAPTER SEALED','The city is quiet again.') + '<p class="lead">The decisions are filed. The conversation is yours to keep.</p>' + `<div class="postcard"><p class="eyebrow">VIENNA / LIAM & ADDISON / 1983</p><h3>${esc(E.outcome(state).title)}</h3><p class="receipt">${esc(state.residence.note || 'An evening of diplomacy, together.')}</p><p class="small">Our residence ritual: ${esc(state.residence.ritual || 'To be decided over our next call.')}</p></div><p>You have reached the end of this prototype. A replay can reveal different documents, reactions and outcomes. The China posting is still unopened.</p><div class="scene-actions">${button('Download our chapter','download')}${button('Read the debrief again','debrief',true)}</div>`;
      break;
  }
  bindScene();
}
function renderMemo() {
  $('scene').innerHTML = heading('23:00 / EYES ONLY · THE PRESIDENT','Write the night cable.') + '<p>One person types for both. Give Washington a concise account, the uncertainty, and a recommendation you can defend.</p><p class="small">Prototype review uses your evidence labels, responsibility assessment and selected policy. Your prose is saved for your discussion; it is not interpreted or graded by AI.</p>' +
    [['facts','What happened?','Separate the detention from the allegations.'],['uncertainty','What remains uncertain?','What would change your assessment?'],['reason','Why this recommendation?','Explain the benefit, the risk, and when you would reconsider.']].map(([key,label,placeholder])=>`<div class="form-section"><label for="draft-${key}">${label}</label><textarea id="draft-${key}" data-draft="${key}" minlength="20" maxlength="800" placeholder="${placeholder}">${esc(state.draft[key])}</textarea><p class="small">A sentence or two · at least 20 characters</p></div>`).join('') + '<div class="form-section"><label for="attribution">Your assessment of responsibility</label><select id="attribution" data-draft="attribution"><option value="">Choose the assessment you will send…</option><option value="unknown">Responsibility and motive are not established</option><option value="soviet">The evidence establishes Soviet direction</option><option value="spies">The evidence establishes that the researchers were spying</option></select></div><p class="form-label">What should the president do?</p>'+`<div class="choice-stack">${D.policies.map(item=>`<button class="story-choice ${state.draft.policy===item.id?'selected':''}" data-policy="${item.id}" aria-pressed="${state.draft.policy===item.id}"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></button>`).join('')}</div><p id="validation" class="validation" role="status"></p><div class="scene-actions">${button('Send the cable →','send')}${button('Revisit our evidence labels','assessment',true)}</div>`;
  $('attribution').value = state.draft.attribution;
}
function renderResponse() {
  const r = state.review;
  const policyText = {quiet:'“You have until morning. Get access, and tell me immediately if the ministry refuses.”',joint:'“Coordinate the demand with our ally. I want one position, not competing statements.”',pressure:'“We will prepare the public statement and diplomatic measures. Be certain you can stand behind what we say.”'}[state.draft.policy];
  $('scene').innerHTML = heading('23:40 / WASHINGTON ANSWERS','Your cable reaches the desk.') + telegram('THE PRESIDENT · SCRIPTED RESPONSE',r.credible?policyText:'“Your attribution or some of your evidence labels go beyond what the documents support. State will check the claims. We can still pursue your proposed approach, but I need a correction before we expand it.”') + chips(r.effects) + `<h3>${r.correct} of ${r.total} evidence assessments supported.</h3><p>${r.attributionGood?'You kept unresolved responsibility separate from established facts.':'You attributed responsibility more confidently than the available material allows.'}</p>${r.feedback.map(item=>`<div class="review-item"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div>`).join('')}<details><summary>Review all evidence explanations</summary>${state.evidence.map(id=>`<div class="review-item"><strong>${esc(D.evidence[id].title)} · ${D.evidence[id].truth}</strong><p>${esc(E.evidenceFor(state,id,D).why)}</p></div>`).join('')}</details><p class="small">This is a scripted simulation. Policy choice and evidence assessment affect confidence and escalation; the wording of your prose does not.</p><div class="scene-actions">${button('Wait for the morning →','followup')}</div>`;
}
function renderEnding() {
  const out = E.outcome(state);
  $('scene').innerHTML = heading('06:45 / THE MORNING AFTER',esc(out.title)) + `<div class="outcome-summary ${out.kind}"><p class="ending-tag">${out.kind==='calm'?'A QUIET RESOLUTION':out.kind==='danger'?'AN ESCALATING CRISIS':'DIPLOMACY CONTINUES'}</p><p class="lead">${esc(out.text)}</p></div><h3>How you got here</h3><p>${esc(out.lesson)}</p><p>Host-country trust ended at <strong>${state.meters.host}</strong>; escalation at <strong>${state.meters.tension}</strong>. ${state.flags.channel?'Your private reception conversation opened better consular access.':state.flags.coalition?'Your allied approach built support, with coordination costs.':'Your public reception demand gained presidential approval and cost host-country trust.'}</p><details><summary>What shaped this ending?</summary><p class="small">A release needs host-country trust of at least 45 and escalation below 60. A requested military alert is authorised at escalation 65 or above when the cable is unreliable or presidential confidence is at least 75. Otherwise, a requested alert is refused. Other paths secure access but leave release unresolved. These are prototype story rules, not a model of real foreign policy.</p></details><h3>History behind the fiction</h3><p>Austria’s 1955 State Treaty ended the occupation. Permanent neutrality was enacted separately that October. Vienna’s international institutions made it a useful setting for this story. The researchers, arrests and presidential decisions in this chapter are invented.</p>${D.sources.map(([title,url])=>`<a class="debrief-link" href="${url}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`).join('')}<div class="scene-actions">${button('Back to the residence →','residence')}${button('Download the decision log','download',true)}</div>`;
}
function renderResidence() {
  $('scene').innerHTML = heading('07:30 / JUST THE TWO OF YOU','Coffee before the city wakes.') + '<p class="lead">The residence is finally quiet. You find two cups, loosen the formal clothes, and sit down together.</p><div class="residence-prompt"><p>What did your partner notice tonight that you missed?</p></div><div class="residence-prompt"><p>Which decision would you make differently if the other person were ambassador?</p></div><p>Answer aloud. No points and no hidden choices.</p><div class="form-section"><label for="residence-ritual">A small ritual for our life at the residence · optional</label><input id="residence-ritual" data-residence="ritual" maxlength="250" placeholder="Coffee on the balcony before opening the cables…" value="'+esc(state.residence.ritual)+'"></div><div class="form-section"><label for="residence-note">One thing to remember from tonight · optional</label><textarea id="residence-note" data-residence="note" maxlength="1500" placeholder="A thought, a disagreement, or a little plan…">'+esc(state.residence.note)+'</textarea></div><div class="scene-actions">'+button('Seal our chapter ♡','complete')+'</div><p class="small">Saved only in this browser. Download a copy on the next screen.</p>';
}
function renderArrival() {
  const revealed=state.stage==='arrival-result';
  const clues=D.clues.slice(0,state.clue).map((clue,i)=>`<article class="clue"><p class="eyebrow">CLUE ${i+1} / 5</p><p>${esc(clue)}</p></article>`).join('');
  const result=state.navigation;
  const left=revealed ? heading('POSTING CONFIRMED',`${D.city.name}, ${D.city.country}.`)+`<p class="lead">The destination is found. Now your posting begins.</p><div class="navigation-score"><p class="metric">${Math.round(result.km).toLocaleString()} km<small>from the city centre</small></p><p class="metric">${result.total} / 120<small>${result.accuracy} accuracy + ${result.bonus} early-solve bonus</small></p></div><p class="small">Solved with ${result.clues} of 5 clues. Your navigation score is separate from the diplomatic relationship meters.</p><details><summary>Read all five clues</summary>${D.clues.map((clue,i)=>`<p class="small">${i+1}. ${esc(clue)}</p>`).join('')}</details><div class="scene-actions">${button('Begin our posting →','welcome')}</div>` : heading('FIRST, THE MAP / AUTUMN 1983','Where are we posted?')+'<p>Someone spilled tea over the destination. Open the clues, talk it through, and pin the <strong>city centre</strong>. Your diplomatic quest starts when you arrive.</p>'+clues+`<div class="scene-actions">${state.clue<D.clues.length?button('Open next clue','clue',true):'<p class="small">All five clues opened. Where will you put your pin?</p>'}</div><p class="small">${state.clue} of 5 clues · ${(5-state.clue)*5} early-solve bonus points available · No timer</p>`;
  $('scene').innerHTML=`<div class="arrival-layout"><div>${left}</div><div class="navigation-map"><p class="eyebrow">${revealed?'YOUR GUESS & YOUR DESTINATION':'A WORLD OF POSSIBILITIES'}</p><div id="map" class="arrival-map" aria-label="Map: click to choose the city"></div><p id="pin-status" class="small" role="status">${revealed?'Green is your guess. Peach is the city centre.':state.pin?'Your pin is placed. Move it until you both agree.':'Tap the map to place your pin. Zoom in to find the city.'}</p>${revealed?'':`<details><summary>Place a pin using coordinates</summary><form id="navigation-coordinates"><label>Latitude<input id="navigation-lat" type="number" min="-85" max="85" step="any" required value="${state.pin?state.pin.lat.toFixed(4):''}"></label><label>Longitude<input id="navigation-lng" type="number" min="-180" max="180" step="any" required value="${state.pin?state.pin.lng.toFixed(4):''}"></label><button class="secondary" type="submit">Place pin</button></form></details><div class="scene-actions">${button('Agree & lock our pin →','lock-arrival')}</div><p class="small">One shared guess. You can open more clues before locking.</p>`}</div></div>`;
  initializeMap();
}
let navigationMarker=null;
function placeNavigationPin(lat,lng) {
  if (state.stage!=='arrival' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>85 || Math.abs(lng)>180)return;
  state.pin={lat,lng};
  if(map){if(navigationMarker)map.removeLayer(navigationMarker);navigationMarker=L.circleMarker([lat,lng],{radius:7,color:'#263e35',fillColor:'#263e35',fillOpacity:1}).addTo(map);}
  $('pin-status').textContent='Our pin is placed. Move it until you both agree, then lock it.';
  $('navigation-lat').value=lat.toFixed(4);$('navigation-lng').value=lng.toFixed(4);save();
}
function initializeMap() {
  if (!window.L) { $('map').innerHTML='<p style="padding:20px">The online map could not load. Reconnect and refresh, or place a pin using coordinates below.</p>'; return; }
  map = L.map('map',{minZoom:2,maxZoom:11,worldCopyJump:true}).setView(navigationView?navigationView.center:[30,0],navigationView?navigationView.zoom:2);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community',maxZoom:11}).addTo(map).on('tileerror',()=>{$('pin-status').textContent='Some tiles could not load. Reconnect, or place your pin using coordinates below.';});
  navigationMarker=null;
  if(state.pin)navigationMarker=L.circleMarker([state.pin.lat,state.pin.lng],{radius:7,color:'#263e35',fillColor:'#263e35',fillOpacity:1}).addTo(map);
  if(state.stage==='arrival-result') {
    L.circleMarker([D.city.lat,D.city.lng],{radius:9,color:'#9d5d35',fillColor:'#e4a779',fillOpacity:1}).addTo(map).bindTooltip(D.city.name,{permanent:true,direction:'top'});
    const route=L.polyline([[state.pin.lat,state.pin.lng],[D.city.lat,D.city.lng]],{color:'#9d5d35',dashArray:'5 8',weight:2}).addTo(map);
    map.fitBounds(route.getBounds(),{padding:[35,35],maxZoom:8});
  } else map.on('click',event=>placeNavigationPin(event.latlng.lat,((event.latlng.lng+180)%360+360)%360-180));
}
function bindScene() {
  if($('navigation-coordinates'))$('navigation-coordinates').onsubmit=event=>{event.preventDefault();placeNavigationPin(Number($('navigation-lat').value),Number($('navigation-lng').value));};
  $('scene').querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>handleAction(el.dataset.action));
  $('scene').querySelectorAll('[data-reception]').forEach(el=>el.onclick=()=>{if(state.stage!=='reception')return; E.choose(state,D.reception.find(x=>x.id===el.dataset.reception),'investigation');go('consequence');});
  $('scene').querySelectorAll('[data-lead]').forEach(el=>el.onclick=()=>{if(E.investigate(state,el.dataset.lead,D))go('consequence');});
  $('scene').querySelectorAll('[data-final]').forEach(el=>el.onclick=()=>{if(state.stage!=='followup')return;state.flags.finalChoice=el.dataset.final;E.choose(state,D.followups.find(x=>x.id===el.dataset.final),'ending');go('consequence');});
  $('scene').querySelectorAll('[data-assess]').forEach(el=>el.onchange=()=>{state.classifications[el.dataset.assess]=el.value;save();});
  $('scene').querySelectorAll('[data-draft]').forEach(el=>{
    const update=()=>{state.draft[el.dataset.draft]=el.value;save();};
    el.oninput=update; el.onchange=update;
  });
  $('scene').querySelectorAll('[data-residence]').forEach(el=>el.oninput=()=>{state.residence[el.dataset.residence]=el.value;save();});
  $('scene').querySelectorAll('[data-policy]').forEach(el=>el.onclick=()=>{
    state.draft.policy=el.dataset.policy;save();
    $('scene').querySelectorAll('[data-policy]').forEach(b=>{const selected=b===el;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  });
}
function handleAction(action) {
  if (action==='arrive') return go('arrival');
  if (action==='clue') {state.clue=Math.min(D.clues.length,state.clue+1);save();return render();}
  if (action==='lock-arrival') {
    if (!E.finishNavigation(state,D)) { $('pin-status').textContent='Place a city guess on the map first, then agree and lock your pin.'; return; }
    return go('arrival-result');
  }
  if (action==='continue') {const next=state.pending;state.pending=null;return go(next);}
  if (action==='memo' && state.evidence.some(id=>!state.classifications[id])) { $('validation').textContent='Choose an assessment for each claim before drafting.'; return; }
  if (action==='send') {
    if (state.stage!=='memo') return;
    if (['facts','uncertainty','reason'].some(key=>state.draft[key].trim().length<20) || !state.draft.attribution || !state.draft.policy) { $('validation').textContent='Write at least a short sentence (20 characters) in each section, then choose a responsibility assessment and policy.'; return; }
    E.reviewBrief(state,D);save();render();$('chapter-progress').scrollIntoView({behavior:'instant'});return;
  }
  if (action==='download') return download();
  if (action==='debrief') return go('ending');
  if (['welcome','briefing','reception','assessment','memo','followup','residence','complete'].includes(action)) return go(action);
}
function download() {
  const report={title:'Embassy for Two — The Night Cable',savedAt:new Date().toISOString(),setting:'Fictional crisis in Vienna, 1983',...state};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='our-night-cable.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('evidence-tab').onclick=()=>{deskTab='evidence';renderDesk();};
$('journal-tab').onclick=()=>{deskTab='journal';renderDesk();};
$('restart').onclick=()=>{if((state.stage==='arrival'&&!state.pin&&state.clue===1)||confirm('Start a fresh posting? This replaces your saved chapter in this browser. Download a finished chapter first if you want to keep it.')){state=E.fresh();navigationView=null;save();render();}};
render();
