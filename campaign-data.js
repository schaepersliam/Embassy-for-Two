(function(root) {
  'use strict';
  const data = {
    city: {name:'Vienna',country:'Austria',lat:48.2082,lng:16.3738},
    clues: [
      'Your host country adopted permanent neutrality in 1955, after a decade of Allied occupation.',
      'Look for a city on the Danube, in the eastern part of its country.',
      'This former imperial capital is known for classical music and a grand boulevard called the Ringstrasse.',
      'The International Atomic Energy Agency established its headquarters in this city in 1957.',
      'Your destination is the capital of Austria.'
    ],
    evidence: {
      detention: {title:'01 / The consular telephone',source:'Embassy duty officer · direct record',text:'Austrian police confirm that two American acoustics researchers are in custody. The embassy has not yet been granted a visit.',truth:'confirmed',why:'The detention itself is directly confirmed. The reason for it is a separate claim.'},
      ministry: {title:'02 / The ministry’s account',source:'Foreign ministry spokesperson · official statement',text:'The ministry says the Americans photographed a restricted radio installation. No photographs or charge sheet have been provided.',truth:'unverified',why:'An official accusation is evidence of the government’s position, not independent confirmation that the alleged act occurred.'},
      intercept: {title:'03 / An allied intercept',source:'Allied liaison · translated extract',text:'An intercepted message mentions “American equipment” and “transfer before morning.” The sender and the thing being transferred are unidentified.',truth:'unverified',why:'The extract is real within the story, but linking it to the detainees or a foreign operation is still speculation.'},
      permit: {title:'04 / The carbon copy',source:'University administrator · original permit',text:'The researchers had permission for a civilian recording project. The permit explicitly excludes government transmission facilities.',truth:'confirmed',why:'The permit is documented. It does not establish where the researchers actually went.'},
      witness: {title:'05 / The café witness',source:'Journalist’s source · partial eyewitness account',text:'A tram driver recalls seeing the researchers near an ordinary relay building. He did not see inside the building and cannot identify who detained them.',truth:'plausible',why:'This is a relevant first-hand account, but incomplete and not independently corroborated.'},
      custody: {title:'06 / The custody register',source:'Consular officer · inspected police register',text:'Both researchers remain at a local police station. The register contains no transfer order. An embassy visit is pencilled in for 08:00, subject to ministry approval.',truth:'confirmed',why:'The current location is documented. A future transfer is still possible; the morning visit is provisional.'},
      translation: {title:'07 / The full translation',source:'Embassy language officer · reviewed original',text:'The intercepted message refers to a shipment of American-made radio valves. There is no mention of prisoners. The extract cannot establish who ordered the arrests.',truth:'confirmed',why:'This corrects the meaning of the intercept. It rules out this message as evidence of a prisoner transfer, not every possible foreign involvement.'}
    },
    reception: [
      {id:'private',title:'Ask for a private conversation',text:'Offer the deputy minister a way to arrange consular access without a public confrontation.',line:'“Help us establish where they are. We can leave the cameras out of it.”',effects:{president:-4,host:12,tension:-5},flags:{channel:true},reply:'The deputy minister slips you a number. “Call this after the reception. And please, no accusations before you have the facts.”',cost:'Washington wanted a visible show of resolve. Your quieter approach buys access, but needs explaining.'},
      {id:'public',title:'Demand an answer in front of the room',text:'Make it impossible for the ministry to pretend this is a minor administrative matter.',line:'“Our citizens are detained. We expect access tonight.”',effects:{president:10,host:-14,allies:3,tension:10},flags:{publicPressure:true},reply:'The room falls quiet. Your allied counterpart nods, but the deputy minister ends the conversation. “We do not negotiate under theatre lights.”',cost:'The pressure is noticed in Washington. The private channel is colder.'},
      {id:'allied',title:'Build a joint approach with your ally',text:'Ask the allied ambassador to make a coordinated request for information.',line:'“Two embassies asking the same precise question may get further than one shouting.”',effects:{president:-2,host:3,allies:12,tension:2},flags:{coalition:true},reply:'Your counterpart agrees to a joint request. They also ask to see your assessment before it goes to Washington.',cost:'You gain another voice, and another government whose priorities you must consider.'}
    ],
    leads: [
      {id:'archive',title:'Call the university',tag:'DOCUMENTS',text:'Find out what the researchers were actually authorised to do.',evidence:'permit',effects:{president:2},reply:'An administrator finds the carbon copy. The project was approved, but the permit had limits. Both the “innocent tourists” and “obvious spies” stories now look too simple.'},
      {id:'reporter',title:'Meet the journalist',tag:'HUMAN SOURCE',text:'Hear an account from someone outside the ministries.',evidence:'witness',effects:{host:-3,allies:3},reply:'A journalist shares a witness account over coffee. It is useful, incomplete, and easy to overstate. You promise not to name the witness in a public statement.'},
      {id:'police',title:'Send a consular officer',tag:'ACCESS',text:'Try to inspect the custody register and secure a visit.',evidence:'custody',effects:{host:4,tension:-4},reply:'The police show your officer the register. Both Americans are still here. A morning visit may be possible.',blockedReply:'Without a warm private channel, the ministry keeps your officer waiting. You obtain written confirmation that both are still in local custody, but no register inspection or promised visit.'},
      {id:'translation',title:'Recheck the allied intercept',tag:'ANALYSIS',text:'Ask your language officer to review the original, not just the extract.',evidence:'translation',effects:{allies:-4,tension:-6},reply:'The full message concerns radio components. Your ally is embarrassed by the early interpretation, but your assessment is now less likely to turn an ambiguous sentence into a crisis.'}
    ],
    policies: [
      {id:'quiet',title:'A private, time-limited negotiation',text:'Request access by morning, keep the public statement factual, and reassess if access is refused.'},
      {id:'joint',title:'A coordinated diplomatic demand',text:'Issue a joint request with the ally and prepare targeted diplomatic consequences if access is denied.'},
      {id:'pressure',title:'Public pressure now',text:'Condemn the detention publicly and threaten diplomatic expulsions unless the researchers are released.'}
    ],
    followups: [
      {id:'verify',title:'Call the duty officer before responding',text:'Verify the reported vehicle movement. Hold the public line for thirty minutes.',effects:{president:-4,host:5,tension:-12},reply:'The vehicle carries laboratory equipment, not the researchers. Both are still at the station. You have spent time and avoided treating an unverified report as a confirmed transfer.'},
      {id:'warn',title:'Deliver a private warning through the ministry',text:'Ask for immediate confirmation of custody and state that a transfer would trigger a response.',effects:{president:5,host:-5,tension:5},reply:'The ministry confirms both researchers remain in custody. Your warning gets a reply, but officials resent the implication that they are secretly moving prisoners.'},
      {id:'escalate',title:'Ask Washington for a military signal',text:'Recommend an alert by U.S. forces outside Austria to demonstrate resolve. Your president must decide whether to act.',effects:{president:3,host:-18,allies:-12,tension:25},reply:'Washington considers the request. Your ally warns that a military signal could turn a detention dispute into a wider confrontation. The vehicle report is still unconfirmed.'}
    ],
    sources: [
      ['The city’s geography and musical history · UNESCO','https://whc.unesco.org/en/list/1033'],
      ['Austria’s State Treaty and neutrality · U.S. Office of the Historian','https://history.state.gov/historicaldocuments/frus1955-57v05/d76'],
      ['1955: The Austrian State Treaty · House of Austrian History','https://hdgoe.at/state_treaty'],
      ['IAEA milestones · International Atomic Energy Agency','https://www.iaea.org/sites/default/files/iaeamilestones.pdf']
    ]
  };
  root.CampaignData = data;
  if (typeof module !== 'undefined') module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
