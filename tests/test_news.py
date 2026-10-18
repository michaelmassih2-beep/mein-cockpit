import importlib.util
from pathlib import Path
import unittest
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('news',Path(__file__).resolve().parents[1]/'scripts'/'update_news.py');news=importlib.util.module_from_spec(spec);spec.loader.exec_module(news)
class NewsTests(unittest.TestCase):
 def test_error_does_not_freshen_category(self):
  old={'updatedAt':'2020-01-01T00:00:00Z','categories':{k:[{'title':'Old'}] for k in news.QUERIES}}
  def fail(q):raise OSError('Offline')
  out=news.refresh(old,fail,datetime(2026,10,18,tzinfo=timezone.utc))
  for k in news.QUERIES:self.assertEqual(out['feeds'][k]['updatedAt'],old['updatedAt']);self.assertTrue(out['feeds'][k]['error']);self.assertEqual(out['categories'][k],[{'title':'Old'}])
 def test_success_updates_categories_independently(self):
  out=news.refresh({},lambda q:[{'title':'Current'}],datetime(2026,10,18,tzinfo=timezone.utc))
  self.assertTrue(all(v['updatedAt'].startswith('2026-10-18') and v['error'] is None for v in out['feeds'].values()))
 def test_xml_sort_filter_and_deduplication(self):
  xml=b'<rss><channel>'+b''.join(f'<item><title>Current economic development {i} - Publisher {i}</title><link>https://news.google.com/rss/a{i}</link><source>Publisher {i}</source><pubDate>Sun, 18 Oct 2026 {h}:00:00 GMT</pubDate></item>'.encode() for i,h in [(1,'08'),(2,'12'),(3,'10'),(4,'09')])+b'</channel></rss>'
  rows=news.parse_feed(xml,datetime(2026,10,18,15,tzinfo=timezone.utc));self.assertEqual(len(rows),3);self.assertIn('2',rows[0]['title']);self.assertIn('3',rows[1]['title'])
 def test_external_entities_rejected(self):
  with self.assertRaises(ValueError):news.parse_feed(b'<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><rss/>')
if __name__=='__main__':unittest.main()
