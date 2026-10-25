import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes, connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
row = cur.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

print(f"Total nodes: {len(nodes)}")
for n in nodes:
    if 'Trigger' in n.get('name', '') or n.get('type', '').endswith('Trigger'):
        print("Existing trigger:", n.get('name'), n.get('type'))

conn.close()
