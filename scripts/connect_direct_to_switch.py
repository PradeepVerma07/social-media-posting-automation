import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

# Connect "Content Valid?" (true output, index 0) directly to "Switch Platform"
connections['Content Valid?']['main'][0] = [
    {
        "node": "Switch Platform",
        "type": "main",
        "index": 0
    }
]

cur.execute("UPDATE workflow_entity SET connections = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(connections),))
conn.commit()
print("Connected 'Content Valid?' directly to 'Switch Platform'!")

conn.close()
