import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

lock_node = next((n for n in nodes if n.get('name') == 'Sheet - Lock Row (Processing)'), None)
if lock_node:
    params = lock_node.get('parameters', {})
    print("Lock Node params before:")
    print(json.dumps(params, indent=2))
    
    # In n8n Google Sheets v4.5, for defineBelow or autoMapInputData, 
    # the parameter for matching column is columns.matchingColumns: ["post_id"]
    # AND columnToMatchOn: "post_id" (for older/alternate syntax)
    params['columnToMatchOn'] = 'post_id'
    params['valueToMatchOn'] = '={{ $json.post_id }}'
    cols = params.setdefault('columns', {})
    cols['matchingColumns'] = ['post_id']
    
    # Check all schema items, set canBeUsedToMatch and defaultMatch
    schema = cols.get('schema', [])
    for col in schema:
        if col.get('id') == 'post_id':
            col['defaultMatch'] = True
            col['canBeUsedToMatch'] = True

    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("\nUpdated Lock Node with BOTH columnToMatchOn and columns.matchingColumns!")

conn.close()
