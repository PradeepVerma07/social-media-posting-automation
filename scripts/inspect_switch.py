import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

switch = next((n for n in nodes if n.get('name') == 'Switch Platform'), None)
if switch:
    print("Switch Platform type:", switch.get('type'))
    print("Switch Platform params:")
    print(json.dumps(switch.get('parameters'), indent=2))

conn.close()
