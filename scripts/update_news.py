"""Public RSS news only. Category timestamps never advance on source failure."""
from __future__ import annotations
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'site'/'news.json'
QUERIES={
 'world':'(Weltwirtschaft OR Konjunktur OR Inflation OR IWF OR Weltbank) (site:tagesschau.de OR site:reuters.com OR site:handelsblatt.com OR site:dw.com OR site:zeit.de)',
 'ai':'("Künstliche Intelligenz" OR Cybersicherheit OR Software OR Halbleiter) (site:heise.de OR site:golem.de OR site:tagesschau.de OR site:reuters.com OR site:computerbase.de)',
 'stocks':'(Aktien OR Börse OR DAX OR Nasdaq) (site:handelsblatt.com OR site:reuters.com OR site:tagesschau.de OR site:boerse.ard.de OR site:finanzen.net)'}
class PlainText(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):self.parts.append(data)
def clean_html(text):
 p=PlainText();p.feed(text or '');return re.sub(r'\s+',' ',unescape(' '.join(p.parts))).strip()
def parse_feed(payload,now=None):
 now=now or datetime.now(timezone.utc);items=[]
 if b'<!DOCTYPE' in payload.upper() or b'<!ENTITY' in payload.upper():raise ValueError('XML entities not allowed')
 root=ET.fromstring(payload)
 for raw in root.findall('./channel/item'):
  title=(raw.findtext('title') or '').strip();url=(raw.findtext('link') or '').strip()
  try:when=parsedate_to_datetime(raw.findtext('pubDate') or '').astimezone(timezone.utc)
  except (ValueError,TypeError,OverflowError):continue
  if not now-timedelta(days=4)<=when<=now+timedelta(minutes=10):continue
  if not url.startswith('https://news.google.com/'):continue
  src=raw.find('source');publisher=(src.text or '').strip() if src is not None else 'Google News'
  if title.endswith(' - '+publisher):title=title[:-(len(publisher)+3)]
  if len(title)<15:continue
  if any(x['title'].casefold()==title.casefold() for x in items):continue
  # Aggregator descriptions often consist only of repeated links, so omit them.
  items.append({'title':title,'summary':'','source':publisher,'date':when.date().isoformat(),'publishedAt':when.isoformat(timespec='seconds'),'url':url})
 items.sort(key=lambda x:x['publishedAt'],reverse=True)
 # Prefer source diversity while retaining time order.
 chosen=[];sources=set()
 for item in items:
  if item['source'] not in sources:chosen.append(item);sources.add(item['source'])
  if len(chosen)==3:break
 for item in items:
  if len(chosen)>=3:break
  if item not in chosen:chosen.append(item)
 return chosen
def get_feed(query):
 url='https://news.google.com/rss/search?'+urllib.parse.urlencode({'q':query+' when:3d','hl':'de','gl':'DE','ceid':'DE:de'})
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; PersonalCockpit/3.0)'})
 with urllib.request.urlopen(req,timeout=22) as response:payload=response.read(2500001)
 if len(payload)>2500000:raise ValueError('Feed too large')
 return parse_feed(payload)
def refresh(existing,fetcher=get_feed,now=None):
 stamp=(now or datetime.now(timezone.utc)).isoformat(timespec='seconds');categories={};feeds={}
 def load(pair):
  key,query=pair
  try:
   records=fetcher(query)
   if not records:raise ValueError('Keine aktuellen Treffer')
   # Retained records keep their original article timestamps.
   for old in existing.get('categories',{}).get(key,[]):
    if len(records)>=3:break
    if old.get('title') not in {r['title'] for r in records}:records.append(old)
   return key,records[:3],{'updatedAt':stamp,'attemptedAt':stamp,'error':None,'freshCount':len(records)}
  except Exception as error:
   old_meta=existing.get('feeds',{}).get(key,{})
   return key,existing.get('categories',{}).get(key,[]),{'updatedAt':old_meta.get('updatedAt',existing.get('updatedAt')),'attemptedAt':stamp,'error':type(error).__name__}
 with ThreadPoolExecutor(max_workers=3) as pool:
  for key,records,meta in pool.map(load,QUERIES.items()):categories[key]=records;feeds[key]=meta
 return {'updatedAt':stamp,'method':'Öffentliche Google-News-RSS-Feeds; aktuelle Themen, mehrere etablierte Quellen','categories':categories,'feeds':feeds}
def main():
 try:existing=json.loads(DEST.read_text(encoding='utf-8'))
 except (OSError,ValueError):existing={}
 result=refresh(existing);temp=DEST.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(DEST)
 for key,meta in result['feeds'].items():print(key+': '+str(len(result['categories'][key]))+' Meldungen; '+('beibehalten nach Fehler' if meta['error'] else 'aktualisiert'))
if __name__=='__main__':main()
