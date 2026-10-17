"""Refresh the 2023 WITS five-product import baskets (US$ thousands)."""
import concurrent.futures,html,json,pathlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
def fetch(code):
 url=f'https://wits.worldbank.org/CountryProfile/en/Country/{code}/Year/2023/Summary'
 page=subprocess.check_output(['curl','-fsSL','--retry','2',url]).decode()
 rows=[]
 for m in re.finditer(r"id='E[0-4]'(.*?)</td><td class='alignRight'>([\d,.]+)</td></tr>",page,re.S):
  part=m[1];hs=re.search(r'Product Code\s*</td><td[^>]*>\s*(\d{6})',part);name=re.search(r'Product Name\s*</td><td[^>]*>(.*?)</td>',part,re.S)
  if hs and name:rows.append({'code':hs[1],'original':html.unescape(name[1]),'value':float(m[2].replace(',',''))})
 if len(rows)!=5:raise RuntimeError((code,len(rows)))
 return code,rows
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: data=dict(pool.map(fetch,'AUT DEU CHE NOR IRL PRT CHL PER AUS NZL KEN GHA'.split()))
(ROOT/'assets'/'trade-imports.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data,indent=1))
