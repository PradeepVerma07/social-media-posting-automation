import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('SELECT nodes, connections, versionId FROM workflow_entity WHERE id = ?', ('Utaz0U82aZQZ7uHF',))
row = cur.fetchone()
nodes = json.loads(row[0])
conns = row[1]
v_id = row[2]

posts_sheet = {
    '__rl': True,
    'value': 1931303135,
    'mode': 'list',
    'cachedResultName': 'Posts',
    'cachedResultUrl': 'https://docs.google.com/spreadsheets/d/1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A/edit#gid=1931303135'
}

logs_sheet = {
    '__rl': True,
    'value': 684817390,
    'mode': 'list',
    'cachedResultName': 'Logs',
    'cachedResultUrl': 'https://docs.google.com/spreadsheets/d/1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A/edit#gid=684817390'
}

social_accounts_sheet = {
    '__rl': True,
    'value': 1926378723,
    'mode': 'list',
    'cachedResultName': 'Social_Accounts',
    'cachedResultUrl': 'https://docs.google.com/spreadsheets/d/1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A/edit#gid=1926378723'
}

for n in nodes:
    name = n['name']
    params = n.get('parameters', {})
    if name in ['Sheet - Update Post Result', 'Sheet - Mark Validation Failed', 'Sheet - Update Skipped/Invalid', 'Sheet - Lock Row (Processing)']:
        params['sheetName'] = posts_sheet
        print(f'Set sheetName for {name} to Posts ({posts_sheet["value"]})')
    elif name == 'Sheet - Append Log Entry':
        params['sheetName'] = logs_sheet
        print(f'Set sheetName for {name} to Logs ({logs_sheet["value"]})')
    elif name == 'Sheet - Mark Account Expired':
        params['sheetName'] = social_accounts_sheet
        print(f'Set sheetName for {name} to Social_Accounts ({social_accounts_sheet["value"]})')

cur.execute('UPDATE workflow_entity SET nodes = ? WHERE id = ?', (json.dumps(nodes), 'Utaz0U82aZQZ7uHF'))
cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), conns, v_id))

cur.execute('SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?', ('Utaz0U82aZQZ7uHF',))
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), conns, pub_v_id))

conn.commit()
conn.close()
print('Successfully fixed sheetName parameters on all Google Sheet nodes!')
