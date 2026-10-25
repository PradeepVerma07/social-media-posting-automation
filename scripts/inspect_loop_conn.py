import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

loop_conn = connections.get('Loop Over Posts (Batch 1)')
print("Loop Over Posts connections:")
print(json.dumps(loop_conn, indent=2))

wait_conn = connections.get('Wait Rate Limit (2s)')
print("Wait Rate Limit connections:")
print(json.dumps(wait_conn, indent=2))

switch_conn = connections.get('Switch Platform')
print("Switch Platform connections:")
print(json.dumps(switch_conn, indent=2))

conn.close()
