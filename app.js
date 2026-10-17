'use strict';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'embassy-for-two-passport-v1';
let mission, opened, guess, locked, map, guessMarker, answerMarker, route;
let answers = [], partnerStep = 0, choices = {}, distance = 0, score = 0, saved = false;
let passport = [];
try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(stored)) passport = stored.filter(x => x && typeof x.city === 'string' && typeof x.note === 'string'); } catch { /* Play remains available when storage is unavailable. */ }

function distanceKm(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
function scoreGuess(km, clues) {
  const accuracy = Math.max(0, Math.round(100 * Math.exp(-km / 500)));
  return { accuracy, curiosity: (5 - clues) * 5, total: accuracy + (5 - clues) * 5 };
}

function initializeMap() {
  if (!window.L) {
    $('map').innerHTML = '<p style="padding:24px">The online map could not load. Reconnect and refresh, or enter coordinates below to play.</p>';
    $('coordinate-details').open = true;
    return;
  }
  map = L.map('map', {worldCopyJump:true, minZoom:2, maxZoom:12}).setView([32, 10], 2);
  const tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution:'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom:12
  }).addTo(map);
  tiles.on('tileerror', () => { $('map-status').textContent = 'Some map tiles could not load. Try again with internet, or enter coordinates below.'; });
  map.on('click', event => { if (!locked) placeGuess(event.latlng.lat, ((event.latlng.lng + 180) % 360 + 360) % 360 - 180); });
}

function placeGuess(lat, lng) {
  if (locked || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) return;
  guess = {lat, lng};
  if (map) {
    if (guessMarker) map.removeLayer(guessMarker);
    guessMarker = L.circleMarker([lat,lng], {radius:8,color:'#263e35',fillColor:'#263e35',fillOpacity:1,weight:3}).addTo(map);
  }
  $('latitude').value = lat.toFixed(4); $('longitude').value = lng.toFixed(4);
  $('map-status').textContent = `Our pin: ${lat.toFixed(3)}°, ${lng.toFixed(3)}°. Move it until you both agree.`;
  $('submit-guess').disabled = false;
}

function startMission(index) {
  mission = MISSIONS[index]; opened = 1; guess = null; locked = false; saved = false;
  answers = []; partnerStep = 0; choices = {};
  if (map) {
    [guessMarker,answerMarker,route].forEach(layer => { if (layer) map.removeLayer(layer); });
    map.setView([32,10],2);
  }
  guessMarker = answerMarker = route = null;
  $('file-number').textContent = `NO. ${String(index + 1).padStart(3,'0')}`;
  $('dossier-title').textContent = 'Your posting is a mystery.';
  $('result').hidden = $('off-duty').hidden = true;
  $('submit-guess').disabled = true;
  $('submit-guess').innerHTML = 'Agree & lock our pin <span>→</span>';
  $('latitude').value = $('longitude').value = '';
  $('latitude').disabled = $('longitude').disabled = false;
  $('coordinate-form').querySelector('button').disabled = false;
  $('map-status').textContent = map ? 'Tap the map to place a pin. Zoom in to find the city.' : 'Enter coordinates below to place your pin.';
  $('save-status').textContent = '';
  renderClues();
}

function renderClues() {
  $('clues').innerHTML = mission.clues.slice(0, opened).map(([title,body], index) => `<article class="clue"><p class="eyebrow">CLUE ${index + 1} / ${escapeHtml(title)}</p><p>${escapeHtml(body)}</p></article>`).join('');
  $('clue-count').textContent = `${opened} of 5 clues opened · ${locked ? 'Assignment complete' : `${(5-opened)*5} early-solve bonus points available`}`;
  $('next-clue').disabled = opened === 5;
  $('next-clue').textContent = opened === 5 ? 'All clues opened' : locked ? 'Read another clue (score is saved)' : 'Open next clue';
}

function lockGuess() {
  if (!guess || locked) return;
  locked = true;
  distance = distanceKm(guess, mission);
  const points = scoreGuess(distance, opened); score = points.total;
  $('submit-guess').disabled = true;
  $('submit-guess').textContent = 'Pin locked · Posting revealed';
  $('latitude').disabled = $('longitude').disabled = true;
  $('coordinate-form').querySelector('button').disabled = true;
  $('map-status').textContent = `Your pin is ${Math.round(distance).toLocaleString()} km from ${mission.city} city centre. Peach marks the destination.`;
  if (map) {
    answerMarker = L.circleMarker([mission.lat,mission.lng], {radius:9,color:'#9d5d35',fillColor:'#e4a779',fillOpacity:1,weight:3}).addTo(map).bindTooltip(mission.city, {permanent:true,direction:'top'});
    route = L.polyline([[guess.lat,guess.lng],[mission.lat,mission.lng]], {color:'#9d5d35',dashArray:'5 8',weight:2}).addTo(map);
    map.fitBounds(route.getBounds(), {padding:[40,40],maxZoom:9});
  }
  $('result').innerHTML = `<p class="eyebrow">POSTING CONFIRMED / ${escapeHtml(mission.type)}</p><h2>${escapeHtml(mission.city)}, ${escapeHtml(mission.country)}.</h2><div class="scoreline"><p class="metric">${Math.round(distance).toLocaleString()} km<small>from the city centre</small></p><p class="metric">${opened} / 5<small>clues used</small></p><p class="metric">${score} / 120<small>${points.accuracy} accuracy + ${points.curiosity} early-solve bonus</small></p></div><p>${distance < 30 ? 'Excellent navigating. Time to clock off.' : distance < 300 ? 'In the neighbourhood. Your posting is waiting.' : 'A scenic detour. Every posting still earns a postcard.'}</p><p><strong>A little something to take away</strong><br>${escapeHtml(mission.takeaway)}</p><p><em>${escapeHtml(mission.discussion)}</em></p><details class="sources"><summary>Read the sources & scoring</summary>${mission.sources.map(([label,url])=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join('')}<p class="small">Accuracy: 100 × e^(−distance in km / 500), rounded. Early-solve bonus: 5 points per unopened clue. Maximum 120. Pins target the city centre, not the embassy building. Clues are curated; they are not live news.</p></details><button id="clock-out" class="primary">Clock out together →</button>`;
  $('result').hidden = false;
  $('clock-out').onclick = () => {
    $('clock-out').disabled = true;
    $('clock-out').textContent = 'Off duty below ↓';
    $('off-duty').hidden = false;
    $('off-duty-location').textContent = `You have a free afternoon in ${mission.city}. No work, no studying. What sounds best?`;
    renderPartner(); $('off-duty').scrollIntoView({behavior:'smooth',block:'start'});
  };
  renderClues();
  $('result').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderPartner() {
  const names = ['Liam', 'Addison'];
  const name = names[partnerStep], other = names[1-partnerStep];
  $('partner-stage').innerHTML = `<p class="stage-label">${name}’s turn</p><p class="small">${other}, look away from the shared screen. If you’re screen-sharing, pause sharing for this turn and hand control over for the next. Answers are hidden after each turn.</p><p class="stage-label">What would you choose?</p><div class="choices">${choiceButtons('own')}</div><p class="stage-label">What do you think ${other} would choose?</p><div class="choices">${choiceButtons('prediction')}</div><button id="save-turn" class="primary" disabled>Hide my answers & continue →</button>`;
  $('partner-stage').querySelectorAll('[data-group]').forEach(button => button.onclick = () => {
    const group = button.dataset.group;
    choices[group] = Number(button.dataset.index);
    $('partner-stage').querySelectorAll(`[data-group="${group}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('save-turn').disabled = choices.own === undefined || choices.prediction === undefined;
  });
  $('save-turn').onclick = () => {
    answers[partnerStep] = {...choices}; choices = {};
    $('partner-stage').innerHTML = `<h3>Answers tucked away.</h3><p>${partnerStep === 0 ? 'Addison, it’s your turn. Liam, look away.' : 'You’re both ready. Get back on the call together.'}</p><button id="handoff" class="primary">${partnerStep === 0 ? 'Addison is ready' : 'Reveal our afternoon'} →</button>`;
    $('handoff').onclick = () => { if (partnerStep === 0) {partnerStep = 1; renderPartner();} else revealPartners(); };
  };
}
function choiceButtons(group) {
  return mission.options.map((option,index)=>`<button class="choice" data-group="${group}" data-index="${index}" aria-pressed="false">${String.fromCharCode(65+index)}. ${escapeHtml(option)}</button>`).join('');
}
function revealPartners() {
  const matches = Number(answers[0].prediction === answers[1].own) + Number(answers[1].prediction === answers[0].own);
  $('partner-stage').innerHTML = `<div class="reveal-row"><strong>Liam chose</strong><p>${escapeHtml(mission.options[answers[0].own])}</p><p class="small">Addison predicted: ${escapeHtml(mission.options[answers[1].prediction])} ${answers[1].prediction === answers[0].own ? '✓' : ''}</p></div><div class="reveal-row"><strong>Addison chose</strong><p>${escapeHtml(mission.options[answers[1].own])}</p><p class="small">Liam predicted: ${escapeHtml(mission.options[answers[0].prediction])} ${answers[0].prediction === answers[1].own ? '✓' : ''}</p></div><p><strong>${matches} / 2 predictions matched.</strong> What made you pick your afternoon?</p><div class="postcard"><p class="eyebrow">ONE FOR THE WAY HOME</p><h3>${escapeHtml(mission.personal)}</h3><label for="postcard-note" class="small">Our postcard · optional, saved only in this browser</label><textarea id="postcard-note" maxlength="1500" placeholder="A little plan, a thought, or something to remember…"></textarea></div><button id="save-postcard" class="primary">Stamp our passport ♡</button>`;
  $('save-postcard').onclick = () => savePostcard(matches);
}
function savePostcard(matches) {
  if (saved) return;
  const entry = {missionId:mission.id,city:mission.city,country:mission.country,date:new Date().toISOString(),score,distance:Math.round(distance),matches,note:$('postcard-note').value.trim(),afternoon:answers.map(a=>mission.options[a.own])};
  const updated = [...passport,entry];
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(updated)); passport = updated; $('save-status').textContent = 'Postcard saved in this browser. Open Our passport to revisit it.'; }
  catch { passport = updated; $('save-status').textContent = 'Browser storage is unavailable. Your postcard is here for this session; download the passport to keep it.'; }
  saved = true; $('save-postcard').disabled = true; $('save-postcard').textContent = 'Passport stamped ✓'; $('postcard-note').disabled = true;
  renderPassport();
}
function renderPassport() {
  $('stamp-count').textContent = passport.length;
  $('passport-list').innerHTML = passport.length ? passport.map((entry,index)=>`<article class="passport-card"><p class="eyebrow">OFF DUTY, TOGETHER</p><h3>${escapeHtml(entry.city)}</h3><p class="small">${escapeHtml(entry.country || '')} · ${escapeHtml(new Date(entry.date).toLocaleDateString())} · ${escapeHtml(entry.score)} points</p><p>${escapeHtml(entry.note || 'An evening explored together.')}</p><button class="secondary" data-remove="${index}" aria-label="Remove postcard from ${escapeHtml(entry.city)}">Remove postcard</button></article>`).join('') : '<p>Your first posting is waiting. Complete a mission and stamp your passport.</p>';
  $('passport-list').querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
    const updated = passport.filter((_,index) => index !== Number(button.dataset.remove));
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(updated)); passport = updated; renderPassport(); $('save-status').textContent = 'Postcard removed from this browser.'; }
    catch { $('save-status').textContent = 'Storage is unavailable, so the saved postcard could not be removed. Try again when browser storage is available.'; }
  });
  $('download').disabled = !passport.length;
}
$('mission-select').innerHTML = MISSIONS.map((m,i)=>`<option value="${i}">${escapeHtml(m.label)}</option>`).join('');
$('mission-select').onchange = event => {
  const index = Number(event.target.value);
  if ((guess || opened > 1 || locked) && !saved && !window.confirm('Start another assignment? Your current unsaved round will be lost.')) {
    event.target.value = MISSIONS.indexOf(mission); return;
  }
  startMission(index);
};
$('next-clue').onclick = () => { if (opened < 5) {opened++; renderClues();} };
$('coordinate-form').onsubmit = event => {event.preventDefault(); if ($('latitude').value !== '' && $('longitude').value !== '') placeGuess(Number($('latitude').value),Number($('longitude').value));};
$('submit-guess').onclick = lockGuess;
$('passport-toggle').onclick = () => { const panel = $('passport'); panel.hidden = !panel.hidden; $('passport-toggle').setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) panel.scrollIntoView({behavior:'smooth'}); };
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(passport,null,2)],{type:'application/json'}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'our-embassy-passport.json'; anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
initializeMap(); startMission(0); renderPassport();
