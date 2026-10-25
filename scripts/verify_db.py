import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

lock_node = next((n for n in nodes if n.get('name') == 'Sheet - Lock Row (Processing)'), None)
print('Verified updated Lock Node in DB:')
print('matchingColumns:', lock_node['parameters']['columns']['matchingColumns'])
print('mappingMode:', lock_node['parameters']['columns']['mappingMode'])
print('values:', lock_node['parameters']['columns']['value'])

fb_node = next((n for n in nodes if n.get('name') == 'HTTP - Facebook Publish'), None)
auth = next(p for p in fb_node['parameters']['headerParameters']['parameters'] if p['name'] == 'Authorization')
print('FB Auth contains valid token:', 'EAGVJejn6LZAgBS' in auth['value'])

conn.close()
