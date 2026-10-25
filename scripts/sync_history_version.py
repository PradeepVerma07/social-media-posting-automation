import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get latest nodes and connections from workflow_entity
cur.execute("SELECT versionId, nodes, connections, name FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
v_id, nodes, conns, name = cur.fetchone()

# Update workflow_history for this versionId
cur.execute("UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?", (nodes, conns, v_id))
print("Updated workflow_history for versionId:", v_id)

# Also check workflow_published_version
cur.execute("SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = 'Utaz0U82aZQZ7uHF'")
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    print("Published version ID:", pub_v_id)
    cur.execute("UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?", (nodes, conns, pub_v_id))
    print("Updated workflow_history for publishedVersionId:", pub_v_id)

conn.commit()
conn.close()
