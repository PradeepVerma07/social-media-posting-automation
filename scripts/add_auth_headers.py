import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('SELECT nodes, connections, versionId FROM workflow_entity WHERE id = ?', ('Utaz0U82aZQZ7uHF',))
row = cur.fetchone()
nodes = json.loads(row[0])
conns = row[1]
v_id = row[2]

for n in nodes:
    if n['name'] == 'HTTP - Facebook Publish':
        params = n.get('parameters', {})
        # Ensure Authorization header
        headers = [h for h in params.get('headerParameters', {}).get('parameters', []) if h.get('name') not in ['Authorization', 'Content-Type']]
        headers.append({'name': 'Content-Type', 'value': 'application/json'})
        headers.append({'name': 'Authorization', 'value': '=Bearer {{ $json.access_token }}'})
        params['sendHeaders'] = True
        params['headerParameters'] = {'parameters': headers}
            
        # Ensure access_token in body
        body = [b for b in params.get('bodyParameters', {}).get('parameters', []) if b.get('name') != 'access_token']
        body.append({'name': 'access_token', 'value': '={{ $json.access_token }}'})
        params['sendBody'] = True
        params['bodyParameters'] = {'parameters': body}

    if n['name'] == 'HTTP - IG Create Container':
        params = n.get('parameters', {})
        headers = [h for h in params.get('headerParameters', {}).get('parameters', []) if h.get('name') != 'Authorization']
        headers.append({'name': 'Authorization', 'value': '=Bearer {{ $json.access_token }}'})
        params['sendHeaders'] = True
        params['headerParameters'] = {'parameters': headers}

    if n['name'] == 'HTTP - IG Publish Media':
        params = n.get('parameters', {})
        headers = [h for h in params.get('headerParameters', {}).get('parameters', []) if h.get('name') != 'Authorization']
        headers.append({'name': 'Authorization', 'value': '=Bearer {{ $(\'Loop Over Posts (Batch 1)\').first().json.access_token }}'})
        params['sendHeaders'] = True
        params['headerParameters'] = {'parameters': headers}

cur.execute('UPDATE workflow_entity SET nodes = ? WHERE id = ?', (json.dumps(nodes), 'Utaz0U82aZQZ7uHF'))
conn.commit()

# Update workflow_history
cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), conns, v_id))

cur.execute('SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?', ('Utaz0U82aZQZ7uHF',))
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), conns, pub_v_id))

conn.commit()
conn.close()
print('Successfully saved Authorization headers across workflow_entity and workflow_history!')
