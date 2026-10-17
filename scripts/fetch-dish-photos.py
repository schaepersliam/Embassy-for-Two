"""Refresh curated, openly licensed dish photos and their attribution."""
import html,json,pathlib,re,subprocess,urllib.parse,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
FILES={'AUT': 'Kaiserschmarrn at Weihenstephan 2005-08-03.jpg', 'DEU': 'Currywurst-2024.jpg', 'CHE': 'Rösti Anschnitt.jpg', 'NOR': 'Flickr - cyclonebill - Fiskesuppe.jpg', 'IRL': 'Soda bread.jpg', 'PRT': 'Pastel de nata septembre 2015.jpg', 'CHL': 'Empanada de pino.jpg', 'PER': 'Lomo-saltado-perudelights.jpg', 'AUS': 'NZ Lamington.jpg', 'NZL': 'Pavlova with raspberries.jpg', 'KEN': 'Sukuma wiki kwa wali.jpg', 'GHA': 'Ghanaian Red-Red with Fish.jpg'}
def get(url):return subprocess.check_output(['curl','-fsSL','--retry','3','--retry-delay','5',url])
def plain(value):return html.unescape(re.sub('<[^>]+>','',value)).strip()
folder=ROOT/'assets/dishes';folder.mkdir(parents=True,exist_ok=True)
result={}
for code,title in FILES.items():
 params={'action':'query','format':'json','titles':'File:'+title,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':'600'}
 page=next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))['query']['pages'].values()))
 info=page['imageinfo'][0];meta=info['extmetadata'];url=info.get('thumburl',info['url']);suffix=pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower()
 target=folder/(code+suffix);target.write_bytes(get(url))
 result[code]={'src':target.relative_to(ROOT).as_posix(),'alt':title,'title':title,'artist':plain(meta.get('Artist',{}).get('value','Wikimedia Commons contributor')),'license':plain(meta['LicenseShortName']['value']),'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'source':info['descriptionurl']}
 time.sleep(2)
(folder/'credits.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(ROOT/'dish-photos.js').write_text('(function(root){root.DishPhotos='+json.dumps(result,ensure_ascii=False)+';if(typeof module!=="undefined")module.exports=root.DishPhotos;})(typeof window!=="undefined"?window:globalThis);\n')
