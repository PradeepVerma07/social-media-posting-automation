import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

lock_node = next((n for n in nodes if n.get('name') == 'Sheet - Lock Row (Processing)'), None)
fb_node = next((n for n in nodes if n.get('name') == 'HTTP - Facebook Publish'), None)

print('Lock Node:')
print(json.dumps(lock_node.get('parameters'), indent=2))

print('FB Node:')
print(json.dumps(fb_node.get('parameters'), indent=2))

conn.close()
