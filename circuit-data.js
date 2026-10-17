(function(root){
'use strict';
// Values are US$ thousands, 2023, WITS / UN Comtrade, HS 1988/92 six-digit products.
// Labels are shortened for play; original product codes are retained.
const rows=[
['AUT','at','Austria','Vienna',48.2082,16.3738,'Western Europe',1955,'euro','eu oecd',
[['300290','Blood products & biological cultures',9824589.99],['293379','Lactams (chemical compounds)',5273837.17],['271600','Electrical energy',4496953.60],['300490','Medicines',3815005.25],['840734','Gasoline engines over 1,000 cc',2912899.57]],'Germany',29.05],
['DEU','de','Germany','Berlin',52.52,13.405,'Western Europe',1973,'euro','eu oecd nato',
[['870390','Other passenger motor vehicles',76374135.53],['300490','Medicines',56850820.42],['870323','Gasoline cars, 1,500–3,000 cc',48775737.86],['300290','Blood products & biological cultures',42670660.09],['880240','Large aircraft',25324586.30]],'United States',10.03],
['CHE','ch','Switzerland','Bern',46.948,7.4474,'Western Europe',2002,'Swiss franc','oecd',
[['710812','Unwrought gold',97845510.64],['300290','Blood products & biological cultures',51964731.28],['300490','Medicines',40612496.60],['293390','Nitrogen-containing compounds',14719087.47],['910221','Automatic wristwatches',14390705.90]],'United States',14.97],
['NOR','no','Norway','Oslo',59.9139,10.7522,'Northern Europe',1945,'Norwegian krone','oecd nato',
[['271121','Natural gas (gaseous)',57212323.05],['270900','Crude petroleum',50212905.02],['030212','Fresh or chilled salmon',8610224.13],['271000','Refined petroleum products',6493115.21],['760120','Unwrought aluminum alloys',3468000.95]],'United Kingdom',19.04],
['IRL','ie','Ireland','Dublin',53.3498,-6.2603,'Northern Europe',1955,'euro','eu oecd',
[['300290','Blood products & biological cultures',33113555.73],['300490','Medicines',20447828.54],['293379','Lactams (chemical compounds)',12520479.46],['293799','Hormones & derivatives',11472570],['330210','Food & drink flavoring mixtures',10132184.73]],'United States',27.64],
['PRT','pt','Portugal','Lisbon',38.7223,-9.1393,'Southern Europe',1955,'euro','eu oecd nato',
[['271000','Refined petroleum products',4387996.21],['870322','Gasoline cars, 1,000–1,500 cc',2303530.96],['870899','Motor vehicle parts',1594319.01],['401110','Car tires',1457929.58],['902920','Speed indicators & tachometers',1396531.21]],'Spain',25.75],
['CHL','cl','Chile','Santiago',-33.4489,-70.6693,'South America',1945,'Chilean peso','oecd',
[['260300','Copper ores',24322170.24],['740311','Refined copper cathodes',16948007],['283691','Lithium carbonates',5430282.02],['080920','Fresh cherries',2336818.83],['740200','Unrefined copper & anodes',2134844.50]],'China',39.45],
['PER','pe','Peru','Lima',-12.0464,-77.0428,'South America',1945,'sol','',
[['260300','Copper ores',19991449.25],['710812','Unwrought gold',8372874.09],['740311','Refined copper cathodes',2689386.17],['271000','Refined petroleum products',2378990.31],['080610','Fresh grapes',1745478.60]],'China',35.98],
['AUS','au','Australia','Canberra',-35.2809,149.13,'Oceania',1945,'Australian dollar','oecd commonwealth',
[['260111','Iron ores (non-agglomerated)',89850211.85],['270112','Bituminous coal',67642285.32],['271111','Liquefied natural gas',49515175.70],['710813','Semi-manufactured gold',15595346.22],['253090','Other mineral substances',12671136.05]],'China',32.56],
['NZL','nz','New Zealand','Wellington',-41.2866,174.7756,'Oceania',1945,'New Zealand dollar','oecd commonwealth',
[['040221','Milk powder (over 1.5% fat)',4519639.34],['040500','Butter & other milk fats',2572411.66],['020230','Frozen boneless beef',2094699.10],['440320','Coniferous logs',1991441.50],['020442','Frozen bone-in sheep meat',1497888.28]],'China',26.85],
['KEN','ke','Kenya','Nairobi',-1.2921,36.8219,'Eastern Africa',1963,'Kenyan shilling','commonwealth',
[['090240','Black tea (bulk)',1300348.98],['060310','Fresh cut flowers',660847.75],['271000','Refined petroleum products',357532.97],['090111','Unroasted coffee',246413.87],['261400','Titanium ores',145259.11]],'Uganda',12.53],
['GHA','gh','Ghana','Accra',5.6037,-0.187,'Western Africa',1957,'cedi','commonwealth',
[['710813','Semi-manufactured gold',7632173.31],['270900','Crude petroleum',3984854.97],['180100','Cocoa beans',1107355.82],['180310','Cocoa paste',330660.25],['260200','Manganese ores',314317.14]],'Switzerland',18.25]
];
const countries=rows.map(([id,iso,name,city,lat,lng,region,un,currency,members,products,partner,partnerShare])=>({id,iso,name,city,lat,lng,region,un,currency,members:members.split(' ').filter(Boolean),products:products.map(([code,label,value])=>({code,label,value})),partner,partnerShare,tradeSource:`https://wits.worldbank.org/CountryProfile/en/Country/${id}/Year/2023/Summary`,geoSource:`https://data.un.org/legacy/en/iso/${iso}.html`}));
const sources={
 eu:['European Union membership','https://european-union.europa.eu/principles-countries-history/eu-countries_en'],
 nato:['NATO membership','https://www.nato.int/en/about-us/organization/nato-member-countries'],
 oecd:['OECD membership','https://www.oecd.org/en/about/members-partners.html'],
 commonwealth:['Commonwealth membership','https://thecommonwealth.org/our-member-countries']
};
const rules=[
{id:'eu',title:'The European table',prompt:'Seat the three European Union members.',tip:'EU membership is different from using the euro, or simply being in Europe.',test:c=>c.members.includes('eu'),sources:['eu']},
{id:'nato',title:'The alliance meeting',prompt:'Seat the three NATO members.',tip:'NATO is a defense alliance. European geography alone does not establish membership.',test:c=>c.members.includes('nato'),sources:['nato']},
{id:'commonwealth',title:'The Commonwealth reception',prompt:'Seat the three Commonwealth members.',tip:'The Commonwealth includes republics as well as monarchies. Ireland is not a member.',test:c=>c.members.includes('commonwealth'),sources:['commonwealth']},
{id:'oecd',title:'The policy forum',prompt:'Seat the three OECD members.',tip:'The OECD has members in Europe, the Americas and the Asia-Pacific region.',test:c=>c.members.includes('oecd'),sources:['oecd']},
{id:'oecd-not-eu',title:'Two circles, one table',prompt:'Seat the three OECD members that are NOT in the EU.',tip:'A country must satisfy both conditions: OECD member, outside the European Union.',test:c=>c.members.includes('oecd')&&!c.members.includes('eu'),sources:['oecd','eu']},
{id:'oecd-not-nato',title:'A different coalition',prompt:'Seat the three OECD members that are NOT in NATO.',tip:'Economic cooperation and a defense alliance have different memberships.',test:c=>c.members.includes('oecd')&&!c.members.includes('nato'),sources:['oecd','nato']},
{id:'europe',title:'The regional roundtable',prompt:'Seat the three countries in Europe.',tip:'Use country location here, not EU or NATO membership.',test:c=>c.region.includes('Europe'),sources:[]},
{id:'southern-capitals',title:'South of the line',prompt:'Seat the three countries whose capital or federal city is SOUTH of the equator.',tip:'Think about the city, not whether the entire country lies in one hemisphere.',test:c=>c.lat<0,sources:[]}
];
const partnerRegions={'China':'East Asia','United States':'North America','United Kingdom':'Europe','Germany':'Europe','Spain':'Europe','Switzerland':'Europe','Uganda':'Eastern Africa'};
const data={version:1,tradeYear:2023,membershipDate:'October 16, 2026',countries,rules,sources,partnerRegions};
root.CircuitData=data;if(typeof module!=='undefined')module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
