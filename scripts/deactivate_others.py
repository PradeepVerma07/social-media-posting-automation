import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Find other active workflows
cur.execute("SELECT id, name, active FROM workflow_entity WHERE active = 1")
for r in cur.fetchall():
    print("Active workflow:", r)

# Turn off other legacy workflows if any
cur.execute("UPDATE workflow_entity SET active = 0 WHERE id != 'Utaz0U82aZQZ7uHF'")
conn.commit()
print("Deactivated other workflows so only 'Utaz0U82aZQZ7uHF' is active!")

conn.close()
