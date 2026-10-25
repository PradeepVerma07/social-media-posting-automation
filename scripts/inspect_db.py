import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, name FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
row = cur.fetchone()
print('Found workflow:', row)

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

lock_node = next((n for n in nodes if n.get('name') == 'Sheet - Lock Row (Processing)'), None)
if lock_node:
    print('Lock node parameters in active SQLite:')
    print(json.dumps(lock_node.get('parameters'), indent=2))

conn.close()
