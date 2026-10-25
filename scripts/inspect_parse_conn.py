import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

parse_conn = connections.get('Parse Settings Config')
print("Parse Settings Config connections:")
print(json.dumps(parse_conn, indent=2))

conn.close()
