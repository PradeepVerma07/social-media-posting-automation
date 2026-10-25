import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT versionId, publishedVersionId FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
print('Workflow version columns:', cur.fetchone())

cur.execute("SELECT nodes FROM workflow_published_version WHERE workflowId = 'Utaz0U82aZQZ7uHF'")
row = cur.fetchone()
if row:
    print("Found published version! Updating its nodes too...")
    cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
    latest_nodes = cur.fetchone()[0]
    cur.execute("UPDATE workflow_published_version SET nodes = ? WHERE workflowId = 'Utaz0U82aZQZ7uHF'", (latest_nodes,))
    conn.commit()
    print("Synchronized workflow_published_version!")

conn.close()
