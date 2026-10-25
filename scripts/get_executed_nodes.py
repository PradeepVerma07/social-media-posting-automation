import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    last_node = data[int(data[2]['lastNodeExecuted'])]
    print("Last node executed in 3629:", last_node)
    
    runData_obj = data[int(data[2]['runData'])]
    print("Nodes in runData:", list(runData_obj.keys()))
    
    for k in runData_obj.keys():
        print(f"Node '{k}' executed")

conn.close()
