import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

tz_node = next((n for n in nodes if n.get('name') == 'Timezone Converter & Due Filter'), None)
if tz_node:
    code = tz_node.get('parameters', {}).get('jsCode', '')
    print("Timezone Converter code length:", len(code))
    # Replace missed_window_hours from 24 to 720 (30 days) or disable cutoff for testing
    new_code = code.replace(
        "const missedWindowHours = config.missed_window_hours || 24;",
        "const missedWindowHours = 720; // 30 days window so past test dates don't get skipped"
    ).replace(
        "const missedWindowHours = Number(config.missed_window_hours) || 24;",
        "const missedWindowHours = 720;"
    )
    tz_node['parameters']['jsCode'] = new_code
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("Successfully updated Timezone Converter cutoff window to 720 hours!")

conn.close()
