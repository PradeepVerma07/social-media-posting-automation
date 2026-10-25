import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

trigger = next((n for n in nodes if 'Schedule' in n.get('name', '') or 'Trigger' in n.get('name', '')), None)
if trigger:
    print('Trigger node found:', trigger.get('name'))
    print(json.dumps(trigger.get('parameters'), indent=2))
else:
    print('No trigger node found by name, listing all node names:')
    for n in nodes:
        print(n.get('name'), n.get('type'))

conn.close()
