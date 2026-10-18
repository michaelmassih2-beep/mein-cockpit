"""Refresh the three dashboard news sections from Google News RSS.

No API key or third-party Python packages required. Run from repository root.
Google News links lead to the original publisher via its redirect.
"""
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

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'site' / 'news.json'
QUERIES = {
    'world': 'Weltwirtschaft Konjunktur Inflation IWF Weltbank',
    'ai': 'Künstliche Intelligenz KI Technologie OpenAI Microsoft Nvidia',
    'stocks': 'Aktien Börse DAX Nasdaq Wall Street Aktienmarkt',
}

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, data):
        self.parts.append(data)


def clean_html(s: str) -> str:
    p=PlainText(); p.feed(s or '')
    return re.sub(r'\s+', ' ', unescape(' '.join(p.parts))).strip()


def get_feed(query: str):
    url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({
        'q': query + ' when:3d', 'hl': 'de', 'gl': 'DE', 'ceid': 'DE:de'
    })
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; PersonalDashboard/1.0)'})
    with urllib.request.urlopen(req, timeout=24) as response:
        root = ET.fromstring(response.read(2_500_000))
    items=[]
    threshold=datetime.now(timezone.utc)-timedelta(days=4)
    for raw in root.findall('./channel/item'):
        headline = (raw.findtext('title') or '').strip()
        link = (raw.findtext('link') or '').strip()
        try:
            when=parsedate_to_datetime(raw.findtext('pubDate') or '').astimezone(timezone.utc)
        except Exception:
            continue
        if when < threshold or not link.startswith('https://news.google.com/'):
            continue
        src=raw.find('source')
        publisher=(src.text or '').strip() if src is not None else 'Google News'
        if headline.endswith(' - '+publisher):
            headline=headline[:-(len(publisher)+3)]
        summary=clean_html(raw.findtext('description') or '')
        # Google News description can simply repeat the title and publisher.
        if headline.lower() in summary.lower() or len(summary)<35:
            summary=''
        summary=summary[:170].rstrip(' ,;')
        if not headline or len(headline)<15:
            continue
        if any(x['title'].casefold()==headline.casefold() for x in items):
            continue
        items.append({'title':headline,'summary':summary,'source':publisher,'date':when.date().isoformat(),'url':link})
        if len(items)>=3: break
    return items


def main():
    existing=json.loads(DEST.read_text(encoding='utf-8'))
    incoming={}
    ok=0
    for section,query in QUERIES.items():
        try:
            records=get_feed(query)
            if not records: raise ValueError('Kein aktueller Treffer')
            # Incomplete feeds can be supplemented by the last known source records.
            for item in existing.get('categories',{}).get(section,[]):
                if len(records)>=3: break
                if item.get('title','').casefold() not in {x['title'].casefold() for x in records}:
                    records.append(item)
            incoming[section]=records[:3]
            ok+=1
            print(f'{section}: {len(records)} Treffer')
        except Exception as err:
            incoming[section]=existing.get('categories',{}).get(section,[])
            print(f'{section}: Update nicht möglich ({err}); behalte vorherige Meldungen')
    if ok:
        updated={'updatedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),
                 'method':'Google-News-RSS; drei jüngste passende Treffer je Thema',
                 'categories':incoming}
        DEST.write_text(json.dumps(updated,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Dashboard news refreshed.')
    else:
        print('No fresh feeds; previous news remain unchanged.')

if __name__ == '__main__':
    main()
