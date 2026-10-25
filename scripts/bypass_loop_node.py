import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('SELECT nodes, connections, versionId FROM workflow_entity WHERE id = ?', ('Utaz0U82aZQZ7uHF',))
row = cur.fetchone()
nodes = json.loads(row[0])
conns = json.loads(row[1])
v_id = row[2]

# Connect Content Valid? directly to Switch Platform on main[0]
conns['Content Valid?'] = {
    'main': [
        [{'node': 'Switch Platform', 'type': 'main', 'index': 0}],
        [{'node': 'Sheet - Mark Validation Failed', 'type': 'main', 'index': 0}]
    ]
}

# Connect Is Auth Error? False port (main[1]) to Aggregate Execution Summary instead of looping back
conns['Is Auth Error?'] = {
    'main': [
        [{'node': 'Sheet - Mark Account Expired', 'type': 'main', 'index': 0}],
        [{'node': 'Aggregate Execution Summary', 'type': 'main', 'index': 0}]
    ]
}

cur.execute('UPDATE workflow_entity SET connections = ? WHERE id = ?', (json.dumps(conns), 'Utaz0U82aZQZ7uHF'))
cur.execute('UPDATE workflow_history SET connections = ? WHERE versionId = ?', (json.dumps(conns), v_id))

cur.execute('SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?', ('Utaz0U82aZQZ7uHF',))
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    cur.execute('UPDATE workflow_history SET connections = ? WHERE versionId = ?', (json.dumps(conns), pub_v_id))

conn.commit()
conn.close()
print('Successfully connected Content Valid? -> Switch Platform and closed the pipeline!')
