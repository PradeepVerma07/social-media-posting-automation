import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Find latest execution for workflow Utaz0U82aZQZ7uHF
cur.execute("SELECT id, startedAt, stoppedAt, status FROM execution_entity WHERE workflowId = 'Utaz0U82aZQZ7uHF' ORDER BY id DESC LIMIT 5")
rows = cur.fetchall()
print("Latest executions for Utaz0U82aZQZ7uHF:")
for r in rows:
    print(r)

if rows:
    latest_id = rows[0][0]
    cur.execute("SELECT data FROM execution_data WHERE executionId = ?", (latest_id,))
    raw = cur.fetchone()[0]
    data = json.loads(raw)
    last_node = data[int(data[2]['lastNodeExecuted'])]
    print(f"Latest execution {latest_id} finished at node: {last_node}")
    runData_obj = data[int(data[2]['runData'])]
    print("Nodes executed:", list(runData_obj.keys()))

conn.close()
