import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes, connections FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
row = cur.fetchone()
nodes = json.loads(row[0])
connections = json.loads(row[1])

webhook_node = next((n for n in nodes if n.get('name') == 'Webhook - Instant Schedule Trigger'), None)

if not webhook_node:
    webhook_node = {
        "parameters": {
            "httpMethod": "POST",
            "path": "schedule-post",
            "responseMode": "onReceived",
            "responseData": "allEntries",
            "options": {}
        },
        "id": "node-webhook-schedule-post",
        "name": "Webhook - Instant Schedule Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [
            -400,
            150
        ],
        "webhookId": "schedule-post-webhook-id"
    }
    nodes.append(webhook_node)

connections['Webhook - Instant Schedule Trigger'] = {
    "main": [
        [
            {
                "node": "Sheet - Read Settings",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

cur.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes), json.dumps(connections)))

# Register in webhook_entity table
cur.execute("DELETE FROM webhook_entity WHERE workflowId = 'Utaz0U82aZQZ7uHF' AND webhookPath = 'schedule-post'")
cur.execute("""
    INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength)
    VALUES ('Utaz0U82aZQZ7uHF', 'schedule-post', 'POST', 'Webhook - Instant Schedule Trigger', 'schedule-post-webhook-id', 13)
""")

conn.commit()
conn.close()
print("Webhook entity and node saved successfully!")
