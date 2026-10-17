(function(root){
'use strict';
const D=root.CircuitData;
// A simplified mainland-Europe game board. Only listed countries are usable.
// Geography reference: Eurostat GISCO, Countries 2024. Closures are fictional.
const rows=[['PT','Portugal',-8,39.5,'ES'],['ES','Spain',-3.7,40,'PT FR'],['FR','France',2.2,46.5,'ES BE LU DE CH IT'],['BE','Belgium',4.5,50.7,'FR LU DE NL'],['NL','Netherlands',5.5,52.3,'BE DE'],['LU','Luxembourg',6.1,49.8,'BE FR DE'],['DE','Germany',10.4,51.1,'FR BE NL LU CH AT CZ PL'],['CH','Switzerland',8.2,46.8,'FR DE AT IT'],['IT','Italy',12.6,43,'FR CH AT SI'],['AT','Austria',14.3,47.6,'DE CH IT CZ SK HU SI'],['CZ','Czechia',15.3,49.8,'DE PL SK AT'],['PL','Poland',19.1,52,'DE CZ SK'],['SK','Slovakia',19.5,48.7,'PL CZ AT HU'],['HU','Hungary',19.5,47.1,'AT SK SI HR RS RO'],['SI','Slovenia',14.9,46,'IT AT HU HR'],['HR','Croatia',16.4,45.2,'SI HU RS'],['RS','Serbia',20.9,44.3,'HU HR RO'],['RO','Romania',24.9,45.8,'HU RS']];
D.courierCountries=rows.map(([id,name,lng,lat,neighbors])=>({id,name,lng,lat,neighbors:neighbors.split(' ')}));
D.courierCountry=id=>D.courierCountries.find(c=>c.id===id);
D.courierPathValid=(mission,path)=>Array.isArray(path)&&path.length>0&&path.length-1<=mission.budget&&path[0]===mission.start&&!path.includes(mission.blocked)&&new Set(path).size===path.length&&path.every((id,i)=>D.courierCountry(id)&&(!i||D.courierCountry(path[i-1]).neighbors.includes(id)));
D.courierSolution=(mission,prefix=[mission.start])=>{
 if(!D.courierPathValid(mission,prefix))return null;
 const queue=[[...prefix]];for(let i=0;i<queue.length;i++){const path=queue[i],last=path.at(-1);if(last===mission.end&&path.includes(mission.via))return path;if(last===mission.end||path.length>mission.budget)continue;
 for(const next of D.courierCountry(last).neighbors){if(next===mission.blocked||path.includes(next))continue;queue.push([...path,next]);}}
 return null;
};
const cases=[['PT','PL','CH','CZ'],['ES','RO','CH','DE'],['NL','IT','CZ','CH'],['BE','RO','SI','CZ'],['PT','HU','IT','DE'],['RO','FR','CZ','AT'],['HR','NL','CH','CZ'],['PL','ES','IT','CH'],['NL','RO','SI','SK'],['ES','SK','CH','DE'],['PT','RO','CZ','IT'],['RO','BE','CH','CZ'],['HR','ES','AT','CH'],['PL','IT','FR','AT'],['FR','RO','PL','AT'],['IT','NL','SK','CH'],['BE','HR','PL','CH'],['PT','SK','SI','DE'],['RO','NL','IT','CZ'],['ES','PL','HU','CH']];
D.courierMissions=cases.map(([start,end,via,blocked],i)=>{const m={id:'courier-'+i,start,end,via,blocked,budget:9};const path=D.courierSolution(m);if(!path)throw Error('Unsolvable courier mission '+i);m.budget=path.length;return m;});
D.courierSource='https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units/countries';
if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
