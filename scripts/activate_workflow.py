import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, name, active FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
row = cur.fetchone()
print('Workflow info:', row)

# If not active, activate it!
if row and not row[2]:
    print('Activating workflow Utaz0U82aZQZ7uHF...')
    cur.execute("UPDATE workflow_entity SET active = 1 WHERE id = 'Utaz0U82aZQZ7uHF'")
    conn.commit()
    print('Workflow activated!')

conn.close()
