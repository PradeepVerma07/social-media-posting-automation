import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Find the workflow
cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

modified = False
for n in nodes:
    # 1. Fix Sheet - Lock Row (Processing)
    if n.get('name') == 'Sheet - Lock Row (Processing)':
        print('Updating Sheet - Lock Row (Processing)...')
        cols = n.get('parameters', {}).get('columns', {})
        cols['matchingColumns'] = ['post_id']
        # Also switch to define below so it actually updates status to Processing
        cols['mappingMode'] = 'defineBelow'
        cols['value'] = {
            'status': 'Processing',
            'locked_by_execution': '={{ $execution.id }}',
            'last_attempt_at': '={{ $now.toISO() }}',
            'updated_at': '={{ $now.toISO() }}'
        }
        modified = True
    
    # 2. Fix other Google Sheets update nodes if any
    elif n.get('type') == 'n8n-nodes-base.googleSheets' and n.get('parameters', {}).get('operation') == 'update':
        print(f"Checking Google Sheets update node: {n.get('name')}")
        cols = n.get('parameters', {}).get('columns', {})
        if not cols.get('matchingColumns'):
            cols['matchingColumns'] = ['post_id']
            modified = True

    # 3. Update Facebook and IG credentials with user's verified token
    if 'Facebook' in n.get('name', ''):
        print(f"Updating Facebook node auth: {n.get('name')}")
        headers = n.get('parameters', {}).get('headerParameters', {}).get('parameters', [])
        for h in headers:
            if h.get('name') == 'Authorization':
                h['value'] = "={{ 'Bearer ' + ($json.access_token || 'EAGVJejn6LZAgBSwOKZCX0MFZBkKEHFPTwaUZBex4cC3odbX6WtOCXhAIxV6AE08FAGhnsQgflhWm8sBAP6k58zUoa07OFDCCO53CnfnEG4ZBk7gGf8Y0IKvnn4JOvQFSLJfBOyTgjitx8FshB4VaZBZBrN8GZCJLIZC4Ocnj1UVQqv6w474cO0VW0jy2Rd4Eso72mCUwOzsXsNt0YOZB8rik2fXc9Uw1utjmUoc5Eh4jYZD') }}"
                modified = True

    if 'IG' in n.get('name', ''):
        print(f"Updating IG node auth: {n.get('name')}")
        headers = n.get('parameters', {}).get('headerParameters', {}).get('parameters', [])
        for h in headers:
            if h.get('name') == 'Authorization':
                h['value'] = "={{ 'Bearer ' + ($json.access_token || 'EAGVJejn6LZAgBS8mrc3ZB41OBQywsjJS97CZC4yagW3qsd4JPFemxWiKLyjSOryb6L6x2HX7WI9ensmDgFGq0SE4ZBWMV3x29hESjH8nPhWoUZBUQpYdCvOILNTv3cX2zLCxFWLhKpKNFnRNaTpQb6q5gyqXPDgUiUTRtJxPYGQZCWj9VwlPEAUpeZBBQLXMTdhPXrHej4TJJtLcXG2TL35j61K0SyToKqhIoGQ') }}"
                modified = True

if modified:
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("Successfully updated workflow in SQLite database!")
else:
    print("No modifications made.")

conn.close()
