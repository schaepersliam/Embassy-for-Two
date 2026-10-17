"""Download credited, openly licensed city photos from Wikimedia Commons."""
import html, json, pathlib, re, subprocess, time, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
CITIES={'AUT':'Vienna','DEU':'Berlin','CHE':'Bern','NOR':'Oslo','IRL':'Dublin','PRT':'Lisbon','CHL':'Santiago Chile','PER':'Lima Peru','AUS':'Canberra','NZL':'Wellington New Zealand','KEN':'Nairobi','GHA':'Accra'}
def get(url):
    return subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','30','--retry','3','--retry-delay','5','--retry-all-errors','--user-agent','EmbassyForTwoPrototype/1.0 (city photo attribution research)',url],check=True,stdout=subprocess.PIPE).stdout
def plain(value):return html.unescape(re.sub('<[^>]+>','',value)).strip()
credit_file=ROOT/'assets'/'cities'/'credits.json'
credit_file.parent.mkdir(parents=True,exist_ok=True)
result=json.loads(credit_file.read_text()) if credit_file.exists() else {}
for code,city in CITIES.items():
    if code in result:continue
    time.sleep(2)
    candidates=[]
    for search in ('intitle:'+city.split()[0]+' skyline -Perth -Ontario -Florida filetype:bitmap','intitle:'+city.split()[0]+' panorama filetype:bitmap','intitle:'+city.split()[0]+' filetype:bitmap'):
        params={'action':'query','format':'json','generator':'search','gsrsearch':search,'gsrnamespace':'6','gsrlimit':'8','prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':'1200'}
        data=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
        pages=sorted(data.get('query',{}).get('pages',{}).values(),key=lambda x:x.get('index',999))
        for page in pages:
            info=page.get('imageinfo',[{}])[0];meta=info.get('extmetadata',{})
            license=plain(meta.get('LicenseShortName',{}).get('value',''))
            if re.search(r'Perth|Ontario|Florida',page['title'],re.I):continue
            if not re.search(r'\b'+re.escape(city.split()[0])+r'\b',page['title'],re.I):continue
            if not any(x in license.lower() for x in ('cc by','cc0','public domain')):continue
            ratio=info.get('width',0)/max(1,info.get('height',1))
            if info.get('width',0)<1000 or not 1.3<ratio<3.5:continue
            candidates.append((page,info,meta,license))
        if candidates:break
    if not candidates:raise RuntimeError('No suitable licensed image for '+city)
    page,info,meta,license=candidates[0]
    url=info.get('thumburl',info['url']);suffix=pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower()
    if suffix not in ('.jpg','.jpeg','.png','.webp'):raise RuntimeError('Unsupported format '+suffix)
    output=ROOT/'assets'/'cities'/(code+suffix);output.write_bytes(get(url))
    result[code]={'src':output.relative_to(ROOT).as_posix(),'alt':city+' skyline','title':page['title'].removeprefix('File:'),'artist':plain(meta.get('Artist',{}).get('value','Wikimedia Commons contributor')),'license':license,'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'source':info['descriptionurl']}
    (ROOT/'assets'/'cities'/'credits.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(code+': '+page['title'],flush=True)
(ROOT/'assets'/'cities'/'credits.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')

(ROOT/'city-photos.js').write_text('(function(root){root.CityPhotos='+json.dumps(result,ensure_ascii=False)+';if(typeof module!=="undefined")module.exports=root.CityPhotos;})(typeof window!=="undefined"?window:globalThis);\n')
