import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

trigger = next((n for n in nodes if 'Schedule' in n.get('name', '') or 'Trigger' in n.get('name', '')), None)
if trigger:
    trigger['parameters'] = {
        'rule': {
            'interval': [
                {
                    'field': 'minutes',
                    'minutesInterval': 1
                }
            ]
        }
    }
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print('Updated trigger to run every 1 minute!')

conn.close()
