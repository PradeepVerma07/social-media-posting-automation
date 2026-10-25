import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
nodes = json.loads(cur.fetchone()[0])

webhook_node = next((n for n in nodes if n.get('name') == 'Webhook - Instant Schedule Trigger'), None)
if webhook_node:
    # Ensure standard node defaults
    webhook_node['disabled'] = False
    webhook_node['typeVersion'] = 2
    webhook_node.setdefault('notesInFlow', False)
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("Added disabled: false to Webhook node in workflow!")

conn.close()
