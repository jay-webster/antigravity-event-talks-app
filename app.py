import datetime
import re
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": None
}

def clean_html_links(html_content):
    """
    Ensures all links in the html content open in a new tab (target="_blank")
    and have rel="noopener noreferrer".
    """
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    for a in soup.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return str(soup)

def parse_feed_data(xml_content):
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(xml_content)
    
    entries = root.findall('atom:entry', ns)
    parsed_items = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse the HTML content to extract individual release items
        soup = BeautifulSoup(content_html, 'html.parser')
        h3_tags = soup.find_all('h3')
        
        entry_items = []
        if not h3_tags:
            # If no <h3> categories exist, treat the whole content as one item
            plain_text = soup.get_text()
            plain_text_clean = " ".join(plain_text.split())
            entry_items.append({
                'type': 'Update',
                'content': clean_html_links(content_html),
                'plain_text': plain_text_clean
            })
        else:
            # We have <h3> elements, group content by <h3> headers
            current_type = None
            current_content_parts = []
            
            for child in soup.contents:
                if hasattr(child, 'name') and child.name == 'h3':
                    if current_type and current_content_parts:
                        item_html = "".join(str(c) for c in current_content_parts).strip()
                        item_soup = BeautifulSoup(item_html, 'html.parser')
                        plain_text = item_soup.get_text()
                        plain_text_clean = " ".join(plain_text.split())
                        entry_items.append({
                            'type': current_type,
                            'content': clean_html_links(item_html),
                            'plain_text': plain_text_clean
                        })
                    current_type = child.get_text(strip=True)
                    current_content_parts = []
                else:
                    if current_type:
                        current_content_parts.append(child)
            
            # Append last item
            if current_type and current_content_parts:
                item_html = "".join(str(c) for c in current_content_parts).strip()
                item_soup = BeautifulSoup(item_html, 'html.parser')
                plain_text = item_soup.get_text()
                plain_text_clean = " ".join(plain_text.split())
                entry_items.append({
                    'type': current_type,
                    'content': clean_html_links(item_html),
                    'plain_text': plain_text_clean
                })
        
        # Add entry details to all items parsed from this entry
        for index, item in enumerate(entry_items):
            # Generate a unique ID for each individual update item
            unique_id = f"{entry.find('atom:id', ns).text}_{index}"
            parsed_items.append({
                'id': unique_id,
                'date': date_str,
                'updated': updated_str,
                'link': link,
                'type': item['type'],
                'content': item['content'],
                'plain_text': item['plain_text']
            })
            
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Check cache
    now = datetime.datetime.now()
    if not force_refresh and cache['data'] and cache['last_updated']:
        # Cache for 5 minutes
        time_diff = now - cache['last_updated']
        if time_diff.total_seconds() < 300:
            return jsonify({
                'source': 'cache',
                'last_updated': cache['last_updated'].isoformat(),
                'releases': cache['data']
            })
            
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        releases = parse_feed_data(response.content)
        
        # Update cache
        cache['data'] = releases
        cache['last_updated'] = now
        
        return jsonify({
            'source': 'live',
            'last_updated': now.isoformat(),
            'releases': releases
        })
    except Exception as e:
        # If live fetch fails but we have cached data, return cache with a warning
        if cache['data']:
            return jsonify({
                'source': 'cache_fallback',
                'last_updated': cache['last_updated'].isoformat() if cache['last_updated'] else None,
                'releases': cache['data'],
                'error': str(e)
            }), 200
        return jsonify({
            'error': f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
