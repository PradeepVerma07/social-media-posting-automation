import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

norm_conn = connections.get('Normalize Platform Response')
print("Normalize Platform Response connections:")
print(json.dumps(norm_conn, indent=2))

result_conn = connections.get('Sheet - Update Post Result')
print("Sheet - Update Post Result connections:")
print(json.dumps(result_conn, indent=2))

log_conn = connections.get('Sheet - Append Log Entry')
print("Sheet - Append Log Entry connections:")
print(json.dumps(log_conn, indent=2))

auth_conn = connections.get('Is Auth Error?')
print("Is Auth Error connections:")
print(json.dumps(auth_conn, indent=2))

conn.close()
