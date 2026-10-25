import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
connections = json.loads(cur.fetchone()[0])

# Change Parse Settings Config to have a single output that fans out to all 4 nodes
connections['Parse Settings Config'] = {
    "main": [
        [
            {"node": "Sheet - Read Posts", "type": "main", "index": 0},
            {"node": "Sheet - Read Brands", "type": "main", "index": 0},
            {"node": "Sheet - Read Clients", "type": "main", "index": 0},
            {"node": "Sheet - Read Social Accounts", "type": "main", "index": 0}
        ]
    ]
}

cur.execute("UPDATE workflow_entity SET connections = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(connections),))
conn.commit()
print("Updated Parse Settings Config connections to single-output fanout!")

conn.close()
