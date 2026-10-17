(function(root){
'use strict';
const D=root.CircuitData;
// Trade clues use the bundled WITS 2023 baskets; city clues use the linked tourism guides.
const hints={
AUT:['Think Alpine Europe, medicine exports, imperial palaces, and a city with a serious coffeehouse tradition.','Our posting is home to Schönbrunn Palace. Plan on a coffee-and-cake afternoon afterward.','The country is Austria. Find its capital in the eastern part of the country.'],
DEU:['Cars and medicines anchor this European export economy. Our posting is a city shaped by Cold War division.','A former border wall is now an outdoor art gallery here; Museum Island is another local landmark.','The country is Germany. Find its capital in the northeastern part of the country.'],
CHE:['Gold, medicines, and watches leave this Alpine country. Our posting has old-town arcades and a Rose Garden viewpoint.','You are looking for the federal city, rather than Zurich or Geneva.','The country is Switzerland. Find its seat of government on the Swiss Plateau.'],
NOR:['Gas, oil, and salmon are big exports here. Our posting is a northern European waterfront city with a walkable opera-house roof.','The Vigeland sculptures and the harbor are clues to the same capital.','The country is Norway. Look near the southern end of the country.'],
IRL:['Medicines and biological products power this Atlantic island’s exports. Our posting offers a bookish Trinity visit and coastal trips to Howth.','The Book of Kells is a local draw, and brown soda bread belongs on the menu.','The country is Ireland. Find its capital on the east coast.'],
PRT:['This Atlantic-facing European country exports refined fuels and cars. Our posting has hilly streets, custard tarts, and a waterfront district called Belém.','Explore Alfama for winding lanes, then head toward the river in Belém.','The country is Portugal. Its capital is on the western coast, well south of Porto.'],
CHL:['Copper ore leads this South American country’s exports. Our posting sits inland beside the Andes, rather than on the Pacific coast.','Cerro San Cristóbal is a local viewpoint; Lastarria is a neighborhood for an afternoon wander.','The country is Chile. Find its capital in the central part of the long, narrow country.'],
PER:['Copper ore and gold are major exports here. Our South American posting is a Pacific-coast city with ocean walks in Miraflores.','Barranco’s colorful streets and a plate of lomo saltado point to the same city.','The country is Peru. Find its coastal capital, rather than the inland city of Cusco.'],
AUS:['Iron ore, coal, and natural gas lead this country’s exports. Our posting is an inland capital with a lake and a national art gallery.','Lake Burley Griffin is the giveaway. You are looking for neither Sydney nor Melbourne.','The country is Australia. Its capital lies between Sydney and Melbourne, inland from the southeast coast.'],
NZL:['Milk powder, butter, and beef are major exports here. Our posting is a harbor capital with a national museum called Te Papa.','Look near the southern tip of the North Island, rather than in Auckland.','The country is New Zealand. Its capital faces Cook Strait.'],
KEN:['Tea and cut flowers lead this East African country’s export basket. Our posting pairs city life with Karura Forest and a nearby national park.','The wildlife park shares the capital’s name. Sukuma wiki would fit a dinner here.','The country is Kenya. Find its inland capital south of the equator.'],
GHA:['Gold, crude oil, and cocoa lead this West African country’s exports. Our posting is a coastal capital with a memorial to Kwame Nkrumah.','Historic Jamestown and a plate of red red belong to this same city.','The country is Ghana. Find its capital on the Gulf of Guinea.']
};
D.postingClues=c=>[...hints[c.id],`Your posting is ${c.city}, ${c.name}. Find it on the map.`,`Pinpoint help: ${c.city} is near ${Math.abs(c.lat).toFixed(2)}° ${c.lat<0?'S':'N'}, ${Math.abs(c.lng).toFixed(2)}° ${c.lng<0?'W':'E'}.`];
D.postingSources=c=>[['Trade clues · WITS / UN Comtrade',c.tradeSource],...root.CityGuide[c.id].activities.map(([title,,url])=>[title+' · city guide',url])];
if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
