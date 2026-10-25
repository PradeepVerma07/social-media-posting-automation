import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('SELECT nodes, connections, versionId FROM workflow_entity WHERE id = ?', ('Utaz0U82aZQZ7uHF',))
row = cur.fetchone()
nodes = json.loads(row[0])
conns = json.loads(row[1])
v_id = row[2]

live_page_token = 'EAGVJejn6LZAgBSxZAyX1JlWMJ2nJBM0ON8ZByRAZBBILZCv8kDJwB40jM2qA5arDAep5cm6gisgUIeW0PovpRBx5pr0rLYAmqvP9vmKpozGjk7UwsS9i2kefGndgvjtDMC3Fb4pssBLv0XDD1kMV0WWgOttox8rvVkJ0FvbcWlazscBOXnVGflU5EHQr6ezqRPoSNLmELWqlrOFaOzL4ClXzhpcGFjNOZBj15NlbMZD'
live_user_token = 'EAGVJejn6LZAgBS9ti94Az8VqSZBuAaLYYdLLLKVB4YdWAGWjmNXipYQJuC5pQjgZCn2Om1B5RJg0y0Oem8J4QAHwfgZCkNiafiemrHrFH7ribhNriULDNyDHVZAxAZCebZCiuVJ9jndSQdUYjzzZAaTQKFYgzrfuZB0GILrBmqQeusoqC7d1bnQchg5II6oNZA3VQSvUPZBANGi91iV6L9t5WkoPXvKCVqEh12lG4CARMUbMciyu0Yu5XA8aXmeYrZAZB3gpwBvU4z1jmpuwZBGmLRTEEf4Rhq'

for n in nodes:
    if n['name'] == 'Timezone Converter & Due Filter':
        code = n['parameters']['jsCode']
        import re
        code = re.sub(r"const fallbackToken = '.*?';", f"const fallbackToken = '{live_user_token}';", code)
        code = re.sub(r"const pageToken = '.*?';", f"const pageToken = '{live_page_token}';", code)
        n['parameters']['jsCode'] = code
        print('Successfully replaced fallbackToken and pageToken in Timezone Converter node!')

cur.execute('UPDATE workflow_entity SET nodes = ? WHERE id = ?', (json.dumps(nodes), 'Utaz0U82aZQZ7uHF'))
cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), json.dumps(conns), v_id))

cur.execute('SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?', ('Utaz0U82aZQZ7uHF',))
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), json.dumps(conns), pub_v_id))

conn.commit()
conn.close()
print('Workflow database updated with active live Meta tokens!')
