import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

tz_node = next((n for n in nodes if n.get('name') == 'Timezone Converter & Due Filter'), None)
if tz_node:
    code = tz_node.get('parameters', {}).get('jsCode', '')
    print("Timezone code:")
    print(code)

conn.close()
