import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

parse_node = next((n for n in nodes if n.get('name') == 'Parse Settings Config'), None)
if parse_node:
    print("Parse Settings Config code:")
    print(parse_node.get('parameters', {}).get('jsCode'))

conn.close()
