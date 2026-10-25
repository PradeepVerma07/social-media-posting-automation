import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Find manual execution 3673
cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3673")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    last_node = data[int(data[2]['lastNodeExecuted'])]
    print("Execution 3673 last node:", last_node)
    runData_obj = data[int(data[2]['runData'])]
    print("Nodes executed in 3673:", list(runData_obj.keys()))
else:
    print("No execution data for 3673")

conn.close()
