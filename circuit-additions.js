(function(root){
'use strict';
const D=root.CircuitData;
// Top five named goods-export destinations, 2023, WITS / UN Comtrade.
// Australia is deliberately excluded from this round: its source ranks an
// unidentified partner aggregate second, which cannot be guessed as a country.
const markets={
AUT:[['Germany',29.05],['United States',7.20],['Italy',6.09],['Switzerland',5.16],['Belgium',3.76]],
DEU:[['United States',10.03],['France',7.55],['Netherlands',7.02],['China',6.19],['Poland',5.71]],
CHE:[['United States',14.97],['Germany',12.18],['China',10.76],['Italy',6.43],['France',4.79]],
NOR:[['United Kingdom',19.04],['Germany',18.96],['Netherlands',8.32],['Sweden',7.72],['Poland',6.07]],
IRL:[['United States',27.64],['United Kingdom',11.42],['Germany',10.38],['Belgium',9.38],['Netherlands',8.48]],
PRT:[['Spain',25.75],['France',13.09],['Germany',10.71],['United States',6.77],['United Kingdom',4.71]],
CHL:[['China',39.45],['United States',15.07],['Japan',7.17],['South Korea',6.34],['Brazil',4.51]],
PER:[['China',35.98],['United States',14.27],['Canada',4.64],['India',3.92],['South Korea',3.64]],
NZL:[['China',26.85],['Australia',12.86],['United States',12.04],['Japan',5.53],['South Korea',3.47]],
KEN:[['Uganda',12.53],['Pakistan',7.87],['Netherlands',7.60],['Tanzania',6.81],['United States',6.41]],
GHA:[['Switzerland',18.25],['South Africa',11.70],['United Arab Emirates',10.15],['China',8.16],['India',6.98]]
};
D.countries.forEach(c=>{c.markets=markets[c.id]||null;});
const has=(c,codes)=>c.products.some(p=>codes.includes(p.code));
const exportSources=ids=>ids.map(id=>[id+' · 2023 WITS trade profile',D.countries.find(c=>c.id===id).tradeSource]);
D.themes=[
{id:'gold',title:'All that glitters',test:c=>has(c,['710812','710813']),clues:['The link is in their export baskets, not a diplomatic organisation.','Look for a precious metal in raw or partly processed form.','Gold is one of each country’s five leading individual export products in our 2023 data.'],explain:'Each has gold among its five leading individual HS6 export products in 2023. The processing stages differ; this is not a ranking of gold mined domestically.'},
{id:'medicines',title:'A prescription for trade',test:c=>has(c,['300490']),clues:['Look at what leaves their factories.','Think pharmacies rather than farms.','Medicines (HS 300490) appear in all three of their leading five-product baskets.'],explain:'All three have medicines (HS 300490) in their five leading individual export products in the 2023 source.'},
{id:'refined-fuels',title:'After the refinery',test:c=>has(c,['271000']),clues:['This connection moves engines, ships and economies.','The product has been processed; it is not crude oil.','Refined petroleum products (HS 271000) are in each country’s five-product export basket.'],explain:'Refined petroleum products (HS 271000) appear in all three leading five-product baskets. That does not mean all three produce their own crude oil.'},
{id:'plant-foods',title:'From the harvest',test:c=>has(c,['080920','080610','090240','090111','180100']),clues:['Look for something that starts in a field or on a tree.','The connection is edible or drinkable, and plant-based.','Cherries, grapes, tea, coffee or cocoa beans appear in their top-five product baskets.'],explain:'Each has at least one of these plant-based foods or drinks among its five leading export products: cherries, grapes, tea, coffee or cocoa beans.'},
{id:'energy',title:'Keeping the lights on',test:c=>has(c,['271600','271121','271111','270900','271000','270112']),clues:['Think about what powers an economy.','One may send electricity, another a fuel.','All three have electricity, petroleum, gas or coal among their five leading export products.'],explain:'Each has an energy product in the five-product source basket: electricity, crude or refined petroleum, natural gas, or coal.'},
{id:'un-1945',title:'There at the beginning',test:c=>c.un===1945,clues:['The connection is historical, rather than commercial.','Think of an international organisation created after the Second World War.','All three joined the United Nations in 1945.'],explain:'UNdata records 1945 as the UN membership year for all three countries.'},
{id:'un-1955',title:'The same year on the invitation',test:c=>c.un===1955,clues:['The connection is a date in diplomatic history.','It concerns joining the United Nations, a decade after its founding.','All three joined the UN in 1955.'],explain:'Austria, Ireland and Portugal all joined the United Nations in December 1955, according to UNdata.'},
{id:'euro',title:'The same change in your pocket',test:c=>c.currency==='euro',clues:['You would notice this connection while travelling.','It is something you could use to pay for coffee.','All three use the euro as their national currency.'],explain:'All three use the euro. Using a currency is a separate fact from geographic location.'},
{id:'copper-chain',title:'From rock to the road',fixed:['CHL','PER','DEU'],clues:['This is a sequence of capabilities, not three identical exports.','Think of a conductive metal used in vehicles.','In their leading export baskets: Chile has copper ore, Peru has refined copper cathodes, and Germany has passenger vehicles.'],explain:'Chile: copper ore → Peru: refined copper cathodes → Germany: passenger vehicles, which use copper. These are complementary capabilities demonstrated by the data, not a claim that a particular shipment travelled between these countries.',extraSources:[['Copper use in cars · IEA','https://www.iea.org/data-and-statistics/charts/minerals-used-in-electric-cars-compared-to-conventional-cars']]}
];
D.themeSources=(theme,ids)=>[...(theme.id.startsWith('un-')||theme.id==='euro'?ids.map(id=>[id+' · UNdata',D.countries.find(c=>c.id===id).geoSource]):exportSources(ids)),...(theme.extraSources||[])];
const codes='AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW'.split(' ');
const display=new Intl.DisplayNames(['en'],{type:'region'});
D.marketNames=[...new Set(codes.map(code=>display.of(code)))].sort((a,b)=>a.localeCompare(b));
const normal=text=>String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
D.countryAliases=Object.fromEntries(D.marketNames.map(name=>[normal(name),name]));
for(const [alias,name] of Object.entries({usa:'United States',us:'United States',unitedstatesofamerica:'United States',uk:'United Kingdom',britain:'United Kingdom',greatbritain:'United Kingdom',korea:'South Korea',republicofkorea:'South Korea',korearepublicof:'South Korea',uae:'United Arab Emirates',czechrepublic:'Czechia',ivorycoast:'Côte d’Ivoire',turkey:'Türkiye'}))D.countryAliases[alias]=D.marketNames.find(n=>normal(n)===normal(name))||name;
D.normalizeCountry=text=>D.countryAliases[normal(text)]||null;
D.additionsVersion=2;
if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
