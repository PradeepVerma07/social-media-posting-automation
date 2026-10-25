import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, startedAt, stoppedAt, status FROM execution_entity ORDER BY id DESC LIMIT 5")
for r in cur.fetchall():
    print(r)

# Check the latest execution data to see what happened at Sheet - Lock Row (Processing)
cur.execute("SELECT executionId, data FROM execution_data ORDER BY executionId DESC LIMIT 1")
row = cur.fetchone()
if row:
    print(f"Latest execution ID: {row[0]}")
    raw = row[1]
    data = json.loads(raw)
    last_node = data[int(data[2]['lastNodeExecuted'])]
    print("Last node executed:", last_node)
    runData_obj = data[int(data[2]['runData'])]
    print("Nodes executed:", list(runData_obj.keys()))
    
    # Check if there is an error in runData
    for k, v in runData_obj.items():
        v_list = data[int(v)] if isinstance(v, str) else v
        if isinstance(v_list, list) and v_list:
            node_run = data[int(v_list[0])]
            if isinstance(node_run, dict) and 'error' in node_run:
                err_idx = node_run['error']
                print(f"Error in node '{k}':", data[int(err_idx)] if isinstance(err_idx, str) and err_idx.isdigit() else err_idx)

conn.close()
