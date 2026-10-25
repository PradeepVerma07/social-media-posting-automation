import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

# In n8n splitInBatches:
# Output index 0 is "loop" (items to process)
# Output index 1 is "done" (when all batches are finished)
# But in some versions, Output 0 is "done" and Output 1 is "loop", or vice versa!
# Let's inspect the node declaration
cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
nodes = json.loads(cur.fetchone()[0])
loop_node = next((n for n in nodes if n.get('name') == 'Loop Over Posts (Batch 1)'), None)
print("Loop node details:", loop_node.get('typeVersion'), loop_node.get('parameters'))

# Let's connect Output 0 AND Output 1 directly or bypass splitInBatches directly to Switch Platform!
# In n8n, n8n nodes automatically loop over all items in an array!
# If we connect "Content Valid?" directly to "Switch Platform", every post is processed cleanly without loop port confusion.
print("\nCurrent connection from Content Valid?:")
print(json.dumps(connections.get('Content Valid?'), indent=2))

conn.close()
