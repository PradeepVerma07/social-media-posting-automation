import sqlite3
import os
import json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
output_dir = os.path.join(os.getcwd(), 'exported_workflows')
os.makedirs(output_dir, exist_ok=True)

conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
cur = conn.cursor()

cur.execute('SELECT id, name, nodes, connections, settings FROM workflow_entity WHERE isArchived = 0 OR isArchived IS NULL')
rows = cur.fetchall()

exported = []
for row in rows:
    wf_id, name, nodes_raw, conn_raw, settings_raw = row
    try:
        nodes = json.loads(nodes_raw) if isinstance(nodes_raw, str) else nodes_raw
        connections = json.loads(conn_raw) if isinstance(conn_raw, str) else conn_raw
        settings = json.loads(settings_raw) if isinstance(settings_raw, str) else (settings_raw or {})
    except Exception as e:
        print(f"Error parsing workflow {name}: {e}")
        continue

    wf_data = {
        "name": name,
        "nodes": nodes,
        "connections": connections,
        "settings": settings
    }

    # Clean filename
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    safe_name = safe_name.replace(' ', '_')
    filename = f"{safe_name}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(wf_data, f, indent=2)

    exported.append((name, filename))

conn.close()
print(f"Successfully exported {len(exported)} workflows into {output_dir}:")
for name, fn in exported:
    print(f" - {filename}")
