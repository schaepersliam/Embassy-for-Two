'use strict';
const D=window.CircuitData,E=window.CircuitEngine,$=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=new URLSearchParams(location.search),storeKey='embassy-circuit-v3'+(query.has('playtest')?'-playtest':'');
let state,history=[],map=null,mapView=null,pinMarker=null;
const country=id=>D.countries.find(c=>c.id===id),rule=id=>D.rules.find(r=>r.id===id),theme=id=>D.themes.find(t=>t.id===id);
const newSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
try{const saved=JSON.parse(localStorage.getItem(storeKey));if(saved&&saved.version===3){history=Array.isArray(saved.history)?saved.history.filter(h=>h&&Number.isInteger(h.seed)&&country(h.hostId)):[];if(E.validate(saved.state,D))state=saved.state;}}catch{}
if(!state)state=E.generate(newSeed(),D,history);
else state=E.upgrade(state,D);
const resourceNames={host:'Host-country trust',allies:'Allied confidence',president:'Presidential confidence'};
const taskNames=['Find the posting','Read the exports','Uncover the link','Pick five markets','Build the coalition'];
function save(){try{localStorage.setItem(storeKey,JSON.stringify({version:3,state,history}));$('save-status').textContent='✓ Saved in this browser';}catch{$('save-status').textContent='Storage unavailable · keep this tab open';}}
function archive(){if(state.phase!=='summit')return;const entry=E.historyEntry(state);const index=history.findIndex(h=>h.seed===state.seed);if(index<0)history.push(entry);else history[index]=entry;save();}
function btn(label,action,secondary=false,disabled=false){return `<button class="${secondary?'secondary':'primary'}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;}
function link(title,url){return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;}
function eyebrow(text){return `<p class="eyebrow">${text}</p>`;}
function scoreTotal(){return state.rounds.reduce((sum,r)=>sum+r.points,0);}
function clues(c){return[
 `Your host country is in ${c.region}, using the UN’s regional grouping.`,
 `It joined the United Nations in ${c.un}.`,
 `The national currency is the ${c.currency}.`,
 `You’re looking for a seat of government beginning with “${c.city[0]}”.`,
 `Your posting is ${c.city}, ${c.name}. Now, can you find it on the map?`
];}
function renderChrome(){
 const r=E.current(state),solved=state.rounds.filter(round=>round.solved).length;
 $('dispatch-number').textContent=`DISPATCH ${String(history.length+(state.phase==='summit'?0:1)).padStart(3,'0')} · ${state.seed.toString(36).toUpperCase()}`;
 $('posting-label').textContent=state.rounds[0].solved?`${country(state.hostId).city} posting · Your summit is taking shape`:'Your destination is still sealed.';
 $('total-score').textContent=`${scoreTotal()} / 500 points`;
 $('passport-count').textContent=new Set(history.map(h=>h.hostId)).size;
 $('progress').innerHTML=state.rounds.map((round,i)=>`<span class="${round.solved?'done':''} ${i===state.index&&state.phase!=='summit'?'current':''}" ${i===state.index&&state.phase!=='summit'?'aria-current="step"':''}><b>${round.solved?'✓':String(i+1).padStart(2,'0')}</b> ${taskNames[i]}</span>`).join('');
 $('favour-meters').innerHTML=Object.entries(state.favours).map(([key,value])=>`<div class="favour-meter"><div><span>${resourceNames[key]}</span><strong>${value}</strong></div><div class="meter-track" role="meter" aria-label="${resourceNames[key]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div></div>`).join('');
 $('summit-seats').innerHTML=`<div class="summit-count"><strong>${solved}<small>/ 5</small></strong><span>summit preparations<br>complete</span></div><ol>${state.rounds.map((round,i)=>`<li class="${round.solved?'ready':''}"><span>${round.solved?'✓':'○'}</span>${taskNames[i]}${round.solved?`<small>${round.assisted?'with help':round.points+' pts'}</small>`:''}</li>`).join('')}</ol>`;
 const mapStage=r.kind==='map'&&state.phase!=='summit';
 document.querySelector('.play-layout').classList.toggle('map-stage',mapStage);
 document.querySelector('.play-layout').classList.toggle('summit-view',state.phase==='summit');
 document.querySelector('.dispatch-sidebar').hidden=mapStage||state.phase==='summit';
 renderPassport();
}
function render(){
 if(map){mapView={center:map.getCenter(),zoom:map.getZoom()};map.remove();map=null;}
 renderChrome();
 if(state.phase==='summit')renderSummit();else if(state.phase==='result')renderResult();else{
  const r=E.current(state);
  if(r.kind==='map')renderMap();else if(['connections','hidden'].includes(r.kind))renderConnections();else if(r.kind==='partner')renderPickFive();else renderTrade();
 }
 bind();
}
function transition(){save();render();$('puzzle').focus({preventScroll:true});$('progress').scrollIntoView({block:'start',behavior:'instant'});}
function renderMap(){
 const r=E.current(state),c=country(r.target);
 $('puzzle').innerHTML=`<div class="map-round"><div>${eyebrow('01 / THE DESTINATION IS MISSING')}<h2>Where are we posted?</h2><p class="puzzle-intro">Find the city together. Then get the world around your summit table.</p>${clues(c).slice(0,r.clues).map((text,i)=>`<article class="clue">${eyebrow('CLUE '+(i+1)+' / 5')}<p>${esc(text)}</p></article>`).join('')}<div class="action-row">${r.clues<5?btn('Open next clue','clue',true):'<p class="small">All five clues opened.</p>'}</div><p class="small">No timer. Each extra clue costs 5 points.</p></div><div class="map-board">${eyebrow('ONE SHARED PIN / A WORLD OF POSSIBILITIES')}<div id="map" aria-label="Click the map to place your city guess"></div><p id="map-status" class="small" role="status">${r.pin?'Your pin is placed. Move it until you both agree.':'Tap to place your pin. Zoom in to find the city.'}</p><details><summary>Place a pin using coordinates</summary><form id="coordinates"><label>Latitude<input id="lat" type="number" min="-85" max="85" step="any" required value="${r.pin?r.pin.lat.toFixed(4):''}"></label><label>Longitude<input id="lng" type="number" min="-180" max="180" step="any" required value="${r.pin?r.pin.lng.toFixed(4):''}"></label><button type="submit" class="secondary">Place pin</button></form></details><div class="action-row">${btn('Agree & lock our pin →','lock-map')}</div><p class="small">Five short puzzles. Talk through every move. One person clicks for both.</p></div></div>`;
 initializeMap(false);
}
function treemap(products){
 const sum=products.reduce((n,p)=>n+p.value,0),rects=[];
 function partition(items,x,y,w,h){if(items.length===1){rects.push({...items[0],x,y,w,h});return;}const total=items.reduce((n,p)=>n+p.value,0);let split=1,subtotal=items[0].value;while(split<items.length-1&&subtotal<total/2){subtotal+=items[split].value;split++;}const ratio=subtotal/total;if(w>=h){partition(items.slice(0,split),x,y,w*ratio,h);partition(items.slice(split),x+w*ratio,y,w*(1-ratio),h);}else{partition(items.slice(0,split),x,y,w,h*ratio);partition(items.slice(split),x,y+h*ratio,w,h*(1-ratio));}}
 partition(products,0,0,100,100);
 return `<div class="export-mosaic" aria-label="Export values: area is proportional to value within the five displayed products">${rects.map(p=>`<div class="export-tile ${p.h<32||p.w<18?'compact':''} tile-${products.indexOf(products.find(item=>item.code===p.code))}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%" title="${esc(p.label)}: US$ ${(p.value/1e6).toFixed(2)} billion, ${(p.value/sum*100).toFixed(1)}% of basket"><strong>${esc(p.label)}</strong><span>${(p.value/sum*100).toFixed(1)}%</span></div>`).join('')}</div>`;
}
function optionCards(r){
 return `<div class="country-options">${r.options.map(id=>{
  const selected=r.selected.includes(id),wrong=r.wrong.includes(id),eliminated=r.eliminated.includes(id),confirmed=r.confirmed.includes(id);
  const name=r.kind==='partner'?id:country(id).name;
  return `<button class="country-card ${selected?'selected':''} ${confirmed?'confirmed':''}" data-option="${esc(id)}" aria-pressed="${selected}" ${wrong||eliminated||confirmed?'disabled':''}><span>${esc(name)}</span><i>${wrong?'×':eliminated?'—':confirmed?'✓':selected?'✓':'+'}</i>${wrong?'<small>Not this one</small>':eliminated?'<small>Ruled out by your ally</small>':confirmed?'<small>Your ally confirms this seat</small>':''}</button>`;
 }).join('')}</div>`;
}
function favourButtons(r){
 const setRound=['connections','hidden'].includes(r.kind);
 const labels=[['host',r.kind==='hidden'?'Another clue · 15 trust':'Local tip · 15 trust'],['allies',r.kind==='partner'?'Suggest a market · 15 allied':setRound?'Confirm a seat · 15 allied':'Rule one out · 15 allied'],['president','Forgive a miss · 20 confidence']].filter(([key])=>r.kind!=='partner'||key!=='president');
 return `<div class="help-desk"><p class="eyebrow">CALL IN A FAVOUR</p><div class="help-buttons">${labels.map(([key,label])=>`<button class="secondary" data-favour="${key}" ${r.favours[key]||state.favours[key]<(key==='president'?20:15)||(key==='president'&&r.tries===0)||(r.kind==='partner'&&key==='allies'&&r.picks.length>=5)||(r.kind==='hidden'&&key==='host'&&r.linkClues>=theme(r.themeId).clues.length)?'disabled':''}>${r.favours[key]?'✓ Used: ':''}${label}</button>`).join('')}</div></div>`;
}
function localTip(r){
 if(!r.favours.host||r.kind==='hidden')return'';
 const c=country(r.target);let text;
 if(r.kind==='connections')text=rule(r.ruleId).tip;
 else if(r.kind==='exports')text=`Look in ${c.region}. The national currency is the ${c.currency}.`;
 else text=`The largest destination is in ${D.partnerRegions[c.partner]}. You still need four others.`;
 return `<div class="local-tip">${eyebrow('A WORD FROM YOUR LOCAL CONTACT')}<p>${esc(text)}</p></div>`;
}
function renderTrade(){
 const r=E.current(state),c=country(r.target),partner=r.kind==='partner';
 $('puzzle').innerHTML=eyebrow(`${state.index+1} / ${partner?'THE TRADE ROUTE':'THE UNMARKED SHIPPING MANIFEST'}`)+`<h2>${partner?'Who’s at the other end?':'Who exports this?'}</h2><p class="puzzle-intro">${partner?`In 2023, which country bought the largest share of <strong>${esc(c.name)}’s goods exports</strong>?`:'A delegation sent its export basket, but forgot the country name. Who should we invite?'}</p>`+(partner?`<div class="market-board"><span>FROM</span><strong>${esc(c.name)}</strong><div class="shipping-line">······················ →</div><span>TOP GOODS EXPORT MARKET / 2023</span><strong class="mystery-destination">?</strong><p>The missing destination received <b>${c.partnerShare.toFixed(2)}%</b> of its reported goods exports.</p></div>`:treemap(c.products))+`<p class="chart-note">${partner?'Trade in goods, not services. Destination of exports, not total two-way trade.':'Real 2023 data · Area and percentages show shares within these five leading HS6 products, not all exports.'}</p>`+(!partner?`<details class="product-values"><summary>See export values & product codes</summary>${c.products.map(p=>`<p><span>${esc(p.label)} <small>HS ${p.code}</small></span><b>$${(p.value/1e6).toFixed(2)}bn</b></p>`).join('')}</details>`:'')+localTip(r)+optionCards(r)+`<p id="round-message" class="round-message" role="status">${esc(r.message)}</p><div class="action-row">${btn('Send our answer →','answer')}${btn('Reveal & keep going','reveal',true)}</div><p class="small">Try as long as you like. Each miss costs 15 points. A reveal moves you forward with 0 points.</p>`+favourButtons(r);
}
function renderConnections(){
 const r=E.current(state),hidden=r.kind==='hidden',g=hidden?theme(r.themeId):rule(r.ruleId);
 const clues=hidden?`<div class="connection-clues">${r.linkClues?g.clues.slice(0,r.linkClues).map((text,i)=>`<article>${eyebrow('CLUE '+(i+1))}<p>${esc(text)}</p></article>`).join(''):`<div class="sealed-link"><span aria-hidden="true">✳</span><p>The link is sealed.<br><small>Start with your own theory. A wrong trio opens a clue.</small></p></div>`}</div>`:'';
 $('puzzle').innerHTML=eyebrow(`${state.index+1} / ${hidden?'THE SECRET OF THE SEATING PLAN':'THE RECEPTION SEATING PLAN'}`)+`<h2>${hidden?'What brings them together?':esc(g.title)}</h2><p class="puzzle-intro">${hidden?'Six countries. Three seats. Find the trio connected by the hidden theme. It might be a shared export, a piece of history, or stages of a supply chain.':esc(g.prompt)+' Three seats, six delegations.'}</p>`+clues+`<div class="three-seats" aria-label="Three seats">${[0,1,2].map(i=>`<div class="seat ${r.selected[i]?'occupied':''}"><span>${i+1}</span><strong>${r.selected[i]?esc(country(r.selected[i]).name):'Open seat'}</strong></div>`).join('')}</div>`+localTip(r)+optionCards(r)+`<p id="round-message" class="round-message" role="status">${esc(r.message)}</p><div class="action-row">${btn('Confirm our table →','check-set')}${btn('Reveal & keep going','reveal',true)}</div><p class="small">${hidden?'Find the intended link; other commonalities may exist. Each distinct wrong trio costs 15 points and opens the next clue, up to three clues. Export links use the five-product baskets in our 2023 source.':'Select exactly three. A wrong trio tells you how many fit. Membership snapshot: '+D.membershipDate+'.'}</p>`+favourButtons(r);
}
function renderPickFive(){
 const r=E.current(state),c=country(r.target);
 $('puzzle').innerHTML=eyebrow('04 / CONNECT THE MARKET · PICK FIVE')+`<h2>Five destinations.<br>One export economy.</h2><p class="puzzle-intro">Name the <strong>five largest destinations for ${esc(c.name)}’s goods exports in 2023</strong>. Type a country, add it to your list, and agree on five before the ranking is revealed.</p><div class="pick-five-slots">${[0,1,2,3,4].map(i=>`<div class="pick-slot ${r.picks[i]?'filled':''}"><span>${i+1}</span><strong>${esc(r.picks[i]||'Your next country…')}</strong>${r.picks[i]?`<button class="quiet" data-remove-pick="${i}" aria-label="Remove ${esc(r.picks[i])}">×</button>`:''}</div>`).join('')}</div><form id="pick-five-form" class="pick-five-form"><label for="country-search">Which country belongs in the top five?</label><div><input id="country-search" type="text" list="country-suggestions" autocomplete="off" placeholder="Start typing a country…" ${r.picks.length===5?'disabled':''}><button class="secondary" type="submit" ${r.picks.length===5?'disabled':''}>Add country +</button></div><datalist id="country-suggestions">${D.marketNames.filter(name=>!r.picks.includes(name)&&name!==c.name).map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist></form>`+localTip(r)+`<p id="round-message" class="round-message" role="status">${esc(r.message)}</p><div class="action-row">${btn('Lock five & reveal the ranking →','lock-five',false,r.picks.length!==5)}${btn('Reveal & keep going','reveal',true)}</div><p class="small">${r.picks.length} / 5 picks · 20 points per correct country · Order doesn’t matter. No right/wrong feedback until you lock. Trade in goods, not services or total two-way trade.</p>`+favourButtons(r);
}
function pickFiveResult(r){
 const c=country(r.target),picks=r.picks||[];
 return `<div class="pick-five-score"><strong>${(r.hits||[]).length}<small> / 5</small></strong><span>countries found</span></div><div class="ranking-table"><div class="ranking-heading"><span>TRUE RANK / 2023</span><span>SHARE OF GOODS EXPORTS</span></div>${c.markets.map(([name,share],i)=>`<div class="ranking-row ${picks.includes(name)?'hit':''}"><span class="market-rank">${i+1}</span><div><strong>${esc(name)} ${picks.includes(name)?'✓':''}</strong><div class="ranking-bar"><span style="width:${share/c.markets[0][1]*100}%"></span></div></div><b>${share.toFixed(2)}%</b></div>`).join('')}</div><p class="small">Your five picks</p><div class="pick-comparison">${picks.map(name=>`<span class="${c.markets.some(m=>m[0]===name)?'hit':'miss'}">${c.markets.some(m=>m[0]===name)?'✓':'×'} ${esc(name)}</span>`).join('')||'<span>No guesses entered before the reveal.</span>'}</div>`;
}
function explanation(r){
 if(r.kind==='hidden'){const t=theme(r.themeId);return{title:t.title,text:t.explain,sources:D.themeSources(t,r.answers)};}
 if(r.kind==='partner'&&r.picks){const c=country(r.target);return{title:'The real top five.',text:'Here are '+c.name+'’s five largest reported goods-export destinations in 2023. Each matched country earns 20 points; the order of your guesses does not matter.',sources:[['2023 export markets · WITS / UN Comtrade',c.tradeSource]]};}
 if(r.kind==='map')return{title:`${country(r.target).city}, ${country(r.target).name}.`,text:`Your pin was ${Math.round(r.km).toLocaleString()} km from the city centre. The host venue is ready.`,sources:[['Geography & city · UNdata',country(r.target).geoSource]]};
 if(r.kind==='exports'){const c=country(r.target);return{title:`Welcome, ${c.name}.`,text:`${c.products[0].label} was the largest of these five individual export products in 2023, worth US$ ${(c.products[0].value/1e6).toFixed(2)} billion. You’ve identified the delegation.`,sources:[['2023 trade profile · WITS / UN Comtrade',c.tradeSource]]};}
 if(r.kind==='partner'){const c=country(r.target);return{title:`The route leads to ${c.partner}.`,text:`${c.partner} received ${c.partnerShare.toFixed(2)}% of ${c.name}’s reported goods exports in 2023, the largest destination share in this source. A new trade connection for your summit.`,sources:[['2023 export markets · WITS / UN Comtrade',c.tradeSource]]};}
 const g=rule(r.ruleId),names=r.answers.map(id=>country(id).name);
 return{title:'A little common ground.',text:`${names.join(', ')} satisfy the table’s rule. ${g.tip}`,sources:g.sources.length?g.sources.map(id=>D.sources[id]):r.options.map(id=>[country(id).name+' · UNdata',country(id).geoSource])};
}
function renderResult(){
 const r=E.current(state),info=explanation(r);
 const content=eyebrow(r.assisted?'ASSIGNMENT COMPLETE / A LITTLE HELP IS ALLOWED':'ASSIGNMENT COMPLETE / ONE STEP CLOSER')+`<h2>${esc(info.title)}</h2><p class="puzzle-intro">${esc(info.text)}</p>${r.kind==='partner'&&r.picks?pickFiveResult(r):''}<div class="result-stats"><p><strong>${r.points}<small>/ 100</small></strong><span>points for the team</span></p><p><strong>+${r.reward.amount}</strong><span>${resourceNames[r.reward.resource]}</span></p></div>`+(['connections','hidden'].includes(r.kind)?`<div class="answer-countries">${r.answers.map(id=>`<span>✓ ${esc(country(id).name)}</span>`).join('')}</div>`:'')+`<details class="source-details"><summary>Sources & a little more context</summary>${info.sources.map(([title,url])=>link(title,url)).join('')}${r.kind==='map'?`<p class="small">City-centre distance, not an embassy building. Accuracy starts at 100 × e^(−km/500), rounded; each extra clue deducts 5 points. Scores stop at zero.</p>`:r.kind==='exports'?'<p class="small">WITS reports individual HS 1988/92 six-digit products, not broad industries. Labels are shortened. This is a five-product basket; re-exports may be included.</p>':r.kind==='connections'?`<p class="small">${esc(rule(r.ruleId).prompt)} Membership data is a curated snapshot, not a live feed.</p>`:''}</details><div class="action-row">${btn(state.index===4?'Open the summit →':'Next assignment →','next')}</div>`;
 $('puzzle').innerHTML=r.kind==='map'?`<div class="map-round"><div>${content}</div><div class="map-board">${eyebrow('GREEN: YOUR PIN / PEACH: THE DESTINATION')}<div id="map" aria-label="Your guess and the destination"></div><p id="map-status" class="small">The posting is found. Time to bring the summit together.</p></div></div>`:content;
 if(r.kind==='map')initializeMap(true);
}
function citySpread(c){
 const guide=window.CityGuide[c.id],photo=window.CityPhotos&&window.CityPhotos[c.id];
 const travelSaved=state.travelSaved||history.some(h=>h.hostId===c.id&&h.travelSaved),recipeSaved=state.recipeSaved||history.some(h=>h.hostId===c.id&&h.recipeSaved);
 return `<section class="destination-spread"><figure class="city-photo">${photo?`<img src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="1200" height="675"><figcaption><span>OFF DUTY / ${esc(c.name.toUpperCase())}</span><h2>Imagine a weekend in ${esc(c.city)}.</h2></figcaption>`:`<h2>A weekend in ${esc(c.city)}.</h2>`}</figure>${photo?`<p class="photo-credit">Photo: ${link(photo.artist,photo.source)} · ${link(photo.license,photo.licenseUrl)} · cropped to fit</p>`:''}<p class="destination-mood">${esc(guide.mood)}</p><div class="destination-columns"><div>${eyebrow('TWO LITTLE PLANS FOR WHEN WE’RE THERE')}${guide.activities.map(([title,text,url])=>`<article class="city-activity"><h3>${esc(title)}</h3><p>${esc(text)}</p>${link('Explore this idea',url)}</article>`).join('')}<button class="secondary ${travelSaved?'saved':''}" data-action="save-trip" aria-pressed="${!!travelSaved}">${travelSaved?'✓ Saved to our future trips':'♡ Add to our future trips'}</button></div><article class="date-night-dish">${eyebrow('A TASTE OF THE POSTING / VIRTUAL DATE NIGHT')}<span class="dish-illustration" aria-hidden="true">♨</span><h3>${esc(guide.dish)}</h3><p>${esc(guide.dishText)}</p>${link('Open the recipe',guide.recipe)}<p class="small">Recipe by ${esc(guide.recipeBy)}</p><button class="primary" data-action="save-recipe" aria-pressed="${!!recipeSaved}">${recipeSaved?'✓ Saved to our cooking dates':'♡ Add to our cooking dates'}</button></article></div></section>`;
}
function renderSummit(){
 const c=country(state.hostId),points=scoreTotal();
 $('puzzle').innerHTML=citySpread(c)+eyebrow('THE SUMMIT IS OPEN / PHONES DOWN FOR A MOMENT')+`<h2>A table set, together.</h2><p class="puzzle-intro">From an unmarked map to a summit in ${esc(c.city)}. Five assignments, one team.</p><div class="summit-medallion"><span>LIAM & ADDISON</span><strong>${points}<small>/ 500</small></strong><span>${points>=400?'A VERY SMOOTH POSTING':points>=250?'DIPLOMACY WELL PRACTISED':'AN EVENING WELL EXPLORED'}</span></div><details class="recap-details"><summary>See our five assignments</summary><div class="round-recap">${state.rounds.map((r,i)=>`<p><span>${i+1}. ${taskNames[i]}</span><strong>${r.points} <small>/ 100</small></strong></p>`).join('')}</div></details><h3>We’ve clocked off. Now what?</h3><p class="small">Pick together for your passport postcard. No predictions, no points.</p><div class="postcard-options">${['A café and a long walk','Find somewhere for dinner','Wander without a plan'].map((text,i)=>`<button class="secondary ${state.postcard===text?'selected':''}" data-postcard="${i}" aria-pressed="${state.postcard===text}">${text}</button>`).join('')}</div><p class="spoken-prompt">Of the places we explored tonight, where would you most want a weekend together?</p><p class="small">Postcard saved automatically in this browser. You’ve visited ${new Set(history.map(h=>h.hostId)).size} of 12 host cities. Each new dispatch reshuffles the circuit.</p><div class="action-row">${btn('Our next dispatch →','new')}${btn('Download this postcard','download',true)}</div>`;
}
function renderPassport(){
 $('passport-list').innerHTML=history.length?history.slice().reverse().map(h=>`<article class="passport-card"><p class="eyebrow">${esc(country(h.hostId).name)} / DISPATCH ${h.seed.toString(36).toUpperCase()}</p><h3>${esc(country(h.hostId).city)}</h3><p>${h.points} / 500 points · ${esc(h.postcard||'A summit, together.')}</p>${h.travelSaved?'<p class="small">♡ On our future-trips list</p>':''}${h.recipeSaved?'<p>'+link('Cook '+window.CityGuide[h.hostId].dish,window.CityGuide[h.hostId].recipe)+'</p>':''}</article>`).join(''):'<p>Your first summit will become your first stamp. There are 12 host cities to discover.</p>';
 const recipes=[...new Map(history.filter(h=>h.recipeSaved).map(h=>[h.hostId,h])).values()];
 if(recipes.length)$('passport-list').innerHTML+='<section class="saved-recipes"><h3>Our virtual date-night kitchen</h3>'+recipes.map(h=>'<p>'+link(window.CityGuide[h.hostId].dish+' · '+country(h.hostId).city,window.CityGuide[h.hostId].recipe)+'</p>').join('')+'</section>';
 $('download-passport').disabled=!history.length;
}
function setPin(lat,lng){
 const r=E.current(state);if(state.phase!=='play'||r.kind!=='map'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180)return;
 r.pin={lat,lng};if(map){if(pinMarker)map.removeLayer(pinMarker);pinMarker=L.circleMarker([lat,lng],{radius:7,color:'#263e35',fillColor:'#263e35',fillOpacity:1}).addTo(map);}
 $('map-status').textContent=`Our pin: ${lat.toFixed(3)}°, ${lng.toFixed(3)}°. Move it until you agree.`;$('lat').value=lat.toFixed(4);$('lng').value=lng.toFixed(4);save();
}
function initializeMap(revealed){
 const r=E.current(state),c=country(r.target);
 if(!window.L){$('map').innerHTML=revealed?'<p class="map-unavailable">The map preview is unavailable. Your distance and score are still recorded.</p>':'<p class="map-unavailable">The map could not load. Reconnect and refresh, or use coordinates below to place your pin.</p>';return;}
 map=L.map('map',{worldCopyJump:true,minZoom:2,maxZoom:12}).setView(mapView?mapView.center:[25,0],mapView?mapView.zoom:2);
 L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:12,attribution:'Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community'}).addTo(map).on('tileerror',()=>{$('map-status').textContent='Some map tiles could not load. Try reconnecting; coordinate entry is also available.';});
 pinMarker=null;if(r.pin)pinMarker=L.circleMarker([r.pin.lat,r.pin.lng],{radius:7,color:'#263e35',fillColor:'#263e35',fillOpacity:1}).addTo(map);
 if(revealed){L.circleMarker([c.lat,c.lng],{radius:9,color:'#9d5d35',fillColor:'#e4a779',fillOpacity:1}).addTo(map).bindTooltip(c.city,{permanent:true,direction:'top'});const route=L.polyline([[r.pin.lat,r.pin.lng],[c.lat,c.lng]],{color:'#9d5d35',weight:2,dashArray:'5 8'}).addTo(map);map.fitBounds(route.getBounds(),{padding:[35,35],maxZoom:9});}
 else map.on('click',event=>setPin(event.latlng.lat,((event.latlng.lng+180)%360+360)%360-180));
}
function newDispatch(){
 if(state.phase!=='summit'&&(state.index>0||E.current(state).pin||E.current(state).clues>1)&&!confirm('Start a new dispatch? Your unfinished dispatch will be replaced. Completed passport stamps stay saved.'))return;
 state=E.generate(newSeed(),D,history);mapView=null;transition();
}
function doAction(action){
 const r=E.current(state);let changed=false;
 if(action==='clue'&&r.kind==='map'&&state.phase==='play'){r.clues=Math.min(5,r.clues+1);save();render();return;}
 if(action==='lock-map'){if(!E.lockMap(state,D)){$('map-status').textContent='Place a pin on the city first, then agree and lock it.';return;}return transition();}
 if(action==='answer'){if(!r.selected.length){r.message='Choose a country together, then send your answer.';save();render();return;}changed=E.answer(state,r.selected[0]);if(state.phase==='play')r.selected=[];}
 if(action==='check-set'){E.checkSet(state);changed=true;}
 if(action==='lock-five')changed=E.lockPicks(state,D);
 if(action==='save-trip'||action==='save-recipe'){const key=action==='save-trip'?'travelSaved':'recipeSaved';const value=!(state[key]||history.some(h=>h.hostId===state.hostId&&h[key]));history.forEach(h=>{if(h.hostId===state.hostId)h[key]=value;});state[key]=value;archive();render();return;}
 if(action==='reveal')changed=E.reveal(state);
 if(action==='next'){changed=E.advance(state);archive();}
 if(action==='next'&&changed)return transition();
 if(action==='new')return newDispatch();
 if(action==='download')return download(E.historyEntry(state),'our-summit-postcard.json');
 if(changed){if(state.phase==='result'||state.phase==='summit')transition();else{save();render();}}
}
function bind(){
 if($('pick-five-form'))$('pick-five-form').onsubmit=event=>{event.preventDefault();const text=$('country-search').value;E.addPick(state,text,D);save();render();if($('country-search')&&!$('country-search').disabled)$('country-search').focus();};
 $('puzzle').querySelectorAll('[data-remove-pick]').forEach(b=>b.onclick=()=>{E.current(state).picks.splice(Number(b.dataset.removePick),1);E.current(state).message='';save();render();});
 $('puzzle').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>doAction(b.dataset.action));
 $('puzzle').querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{const r=E.current(state);if(['connections','hidden'].includes(r.kind))E.select(state,b.dataset.option);else{r.selected=[b.dataset.option];r.message='';}save();render();});
 $('puzzle').querySelectorAll('[data-favour]').forEach(b=>b.onclick=()=>{if(E.useFavour(state,b.dataset.favour,D)){save();render();}});
 $('puzzle').querySelectorAll('[data-postcard]').forEach(b=>b.onclick=()=>{state.postcard=['A café and a long walk','Find somewhere for dinner','Wander without a plan'][Number(b.dataset.postcard)];archive();render();});
 if($('coordinates'))$('coordinates').onsubmit=event=>{event.preventDefault();setPin(Number($('lat').value),Number($('lng').value));};
}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('new-dispatch').onclick=newDispatch;
$('passport-toggle').onclick=()=>{const panel=$('passport');panel.hidden=!panel.hidden;$('passport-toggle').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.scrollIntoView({behavior:'smooth'});};
$('download-passport').onclick=()=>download(history,'our-diplomatic-passport.json');
archive();render();save();
