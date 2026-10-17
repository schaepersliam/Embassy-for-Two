"""Refresh additional WITS 2023 HS6 export profiles for the stage-two country deck."""
import concurrent.futures,html,json,pathlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
COUNTRIES={'USA':('United States','Northern America'),'CAN':('Canada','Northern America'),'MEX':('Mexico','Central America'),'BRA':('Brazil','South America'),'ARG':('Argentina','South America'),'COL':('Colombia','South America'),'GBR':('United Kingdom','Northern Europe'),'FRA':('France','Western Europe'),'ESP':('Spain','Southern Europe'),'ITA':('Italy','Southern Europe'),'NLD':('Netherlands','Western Europe'),'POL':('Poland','Eastern Europe'),'JPN':('Japan','Eastern Asia'),'KOR':('South Korea','Eastern Asia'),'IND':('India','Southern Asia'),'IDN':('Indonesia','Southeastern Asia'),'VNM':('Vietnam','Southeastern Asia'),'THA':('Thailand','Southeastern Asia'),'ZAF':('South Africa','Southern Africa'),'NGA':('Nigeria','Western Africa'),'EGY':('Egypt','Northern Africa'),'MAR':('Morocco','Northern Africa'),'SAU':('Saudi Arabia','Western Asia'),'TUR':('Türkiye','Western Asia')}
def fetch(code):
 name,region=COUNTRIES[code];url=f'https://wits.worldbank.org/CountryProfile/en/Country/{code}/Year/2023/Summary'
 page=subprocess.check_output(['curl','-fsSL','--retry','3','--max-time','40',url]).decode();products=[]
 for m in re.finditer(r"id='[0-4]'(.*?)</td><td class='alignRight'>([\d,.]+)</td></tr>",page,re.S):
  part=m[1];hs=re.search(r'Product Code\s*</td><td[^>]*>\s*(\d{6})',part);label=re.search(r'Product Name\s*</td><td[^>]*>(.*?)</td>',part,re.S)
  if hs and label:products.append({'code':hs[1],'original':html.unescape(label[1]),'value':float(m[2].replace(',',''))})
 if len(products)!=5:raise RuntimeError((code,len(products)))
 return {'id':code,'name':name,'region':region,'tradeSource':url,'products':products}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:profiles=list(pool.map(fetch,COUNTRIES))
(ROOT/'assets/export-expansion.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2)+'\n')
for c in profiles:print(c['id'],[(p['code'],p['original']) for p in c['products']])
