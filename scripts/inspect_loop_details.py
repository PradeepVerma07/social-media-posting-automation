import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

print("Current Loop Over Posts connections:")
print(json.dumps(connections.get('Loop Over Posts (Batch 1)'), indent=2))

# In n8n splitInBatches node:
# Main output 0 is "loop" (each batch of items) -> goes to Wait Rate Limit (2s) -> Switch Platform
# Main output 1 is "done" (when all batches finished) -> goes to Aggregate Execution Summary -> Slack
# And the loop MUST be closed! From the end of the loop (or after Sheet - Append Log Entry), it must connect BACK to Loop Over Posts!

# Check where the end of the loop connects right now:
print("\nIs Auth Error connections:")
print(json.dumps(connections.get('Is Auth Error?'), indent=2))

conn.close()
