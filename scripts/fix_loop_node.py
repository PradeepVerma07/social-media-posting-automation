import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
nodes = json.loads(cur.fetchone()[0])

loop_node = next((n for n in nodes if n.get('name') == 'Loop Over Posts (Batch 1)'), None)
print("Loop node params:", json.dumps(loop_node.get('parameters'), indent=2))
# Make sure batchSize is 1 and reset is FALSE during execution so it doesn't reset on every item!
loop_node['parameters'] = {
    "batchSize": 1,
    "options": {
        "reset": False
    }
}

# Connect Content Valid? -> Loop Over Posts (Batch 1)
cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])
connections['Content Valid?']['main'][0] = [
    {
        "node": "Loop Over Posts (Batch 1)",
        "type": "main",
        "index": 0
    }
]

cur.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes), json.dumps(connections)))
conn.commit()
print("Fixed Loop Over Posts with reset: false and reconnected Content Valid? -> Loop Over Posts!")

conn.close()
