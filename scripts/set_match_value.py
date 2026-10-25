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
    print("Lock Node columns value:")
    print("matchingColumns:", params.get('columns', {}).get('matchingColumns'))
    print("columnToMatchOn:", params.get('columnToMatchOn'))
    print("valueToMatchOn:", params.get('valueToMatchOn'))
    # In n8n v4.5 Google Sheets, when mappingMode is defineBelow, the matching column value is in columns.value[matchingColumn]
    cols = params.setdefault('columns', {})
    val_dict = cols.setdefault('value', {})
    val_dict['post_id'] = '={{ $json.post_id }}'
    params['valueToMatchOn'] = '={{ $json.post_id }}'
    print("Updated columns.value['post_id'] to ={{ $json.post_id }}")
    
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("Committed Lock Node update to database!")

conn.close()
