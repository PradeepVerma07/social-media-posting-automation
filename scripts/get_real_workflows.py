import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')

try:
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    cur = conn.cursor()
    cur.execute('SELECT id, name, active, updatedAt FROM workflow_entity ORDER BY active DESC, updatedAt DESC')
    rows = cur.fetchall()

    workflows = []
    for i, r in enumerate(rows):
        is_active = bool(r[2])
        workflows.append({
            'id': i + 1,
            'workflowName': r[1],
            'n8nWorkflowId': r[0],
            'webhookPath': '/schedule-post' if r[0] == 'Utaz0U82aZQZ7uHF' else f'/wf-{r[0]}',
            'isActive': is_active,
            'description': 'Main active multi-platform social publisher' if r[0] == 'Utaz0U82aZQZ7uHF' else 'Production pipeline in n8n instance'
        })

    conn.close()
    print(json.dumps(workflows))
except Exception as e:
    print(json.dumps([]))
