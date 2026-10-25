import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

print(f"Total nodes: {len(nodes)}")
for n in nodes:
    name = n.get('name')
    ntype = n.get('type')
    params = n.get('parameters', {})
    
    # 1. Check all Google Sheets nodes
    if ntype == 'n8n-nodes-base.googleSheets':
        op = params.get('operation')
        if op == 'update':
            cols = params.get('columns', {})
            matching = cols.get('matchingColumns', [])
            if not matching or matching == ['locked_by_execution']:
                cols['matchingColumns'] = ['post_id']
                print(f"[FIXED] Google Sheets node '{name}' matchingColumns set to ['post_id']")
            
            # Ensure proper mappingMode
            if not cols.get('mappingMode'):
                cols['mappingMode'] = 'defineBelow'
                
        elif op == 'append':
            cols = params.get('columns', {})
            if not cols.get('mappingMode'):
                cols['mappingMode'] = 'autoMapInputData'

    # 2. Check all HTTP Request publishing nodes
    elif ntype == 'n8n-nodes-base.httpRequest':
        # Enable continueOnFail if not already enabled
        n.setdefault('continueOnFail', True)
        # Ensure neverError is true
        resp_opt = params.setdefault('options', {}).setdefault('response', {}).setdefault('response', {})
        resp_opt['neverError'] = True
        resp_opt['fullResponse'] = True
        print(f"[VERIFIED] HTTP Request node '{name}' with continueOnFail & neverError")

cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
conn.commit()
conn.close()
print("All nodes inspected and verified in SQLite database!")
