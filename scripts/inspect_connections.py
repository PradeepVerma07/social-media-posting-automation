import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

unroll_conn = connections.get('Unroll Due Posts')
print("Unroll Due Posts connections:")
print(json.dumps(unroll_conn, indent=2))

lock_conn = connections.get('Sheet - Lock Row (Processing)')
print("Sheet - Lock Row (Processing) connections:")
print(json.dumps(lock_conn, indent=2))

conn.close()
