import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

user_token = 'EAGVJejn6LZAgBS8mrc3ZB41OBQywsjJS97CZC4yagW3qsd4JPFemxWiKLyjSOryb6L6x2HX7WI9ensmDgFGq0SE4ZBWMV3x29hESjH8nPhWoUZBUQpYdCvOILNTv3cX2zLCxFWLhKpKNFnRNaTpQb6q5gyqXPDgUiUTRtJxPYGQZCWj9VwlPEAUpeZBBQLXMTdhPXrHej4TJJtLcXG2TL35j61K0SyToKqhIoGQ'
page_token = 'EAGVJejn6LZAgBSwOKZCX0MFZBkKEHFPTwaUZBex4cC3odbX6WtOCXhAIxV6AE08FAGhnsQgflhWm8sBAP6k58zUoa07OFDCCO53CnfnEG4ZBk7gGf8Y0IKvnn4JOvQFSLJfBOyTgjitx8FshB4VaZBZBrN8GZCJLIZC4Ocnj1UVQqv6w474cO0VW0jy2Rd4Eso72mCUwOzsXsNt0YOZB8rik2fXc9Uw1utjmUoc5Eh4jYZD'

for n in nodes:
    name = n.get('name')
    params = n.get('parameters', {})

    # Fix Lock Node
    if name == 'Sheet - Lock Row (Processing)':
        cols = params.setdefault('columns', {})
        cols['matchingColumns'] = ['post_id']
        cols['mappingMode'] = 'defineBelow'
        cols['value'] = {
            'status': 'Processing',
            'locked_by_execution': '={{ $execution.id }}',
            'last_attempt_at': '={{ $now.toISO() }}',
            'updated_at': '={{ $now.toISO() }}'
        }
        print('Fixed Lock Node: matchingColumns set to post_id, fields defined.')

    # Fix FB Publish Node
    elif name == 'HTTP - Facebook Publish':
        headers = params.setdefault('headerParameters', {}).setdefault('parameters', [])
        # Remove any existing Authorization header
        headers = [h for h in headers if h.get('name') != 'Authorization']
        headers.append({
            'name': 'Authorization',
            'value': f"Bearer {page_token}"
        })
        params['headerParameters']['parameters'] = headers
        print('Fixed HTTP - Facebook Publish: Added Page Authorization header.')

    # Fix IG Create Container
    elif name == 'HTTP - IG Create Container':
        headers = params.setdefault('headerParameters', {}).setdefault('parameters', [])
        headers = [h for h in headers if h.get('name') != 'Authorization']
        headers.append({
            'name': 'Authorization',
            'value': f"Bearer {user_token}"
        })
        params['headerParameters']['parameters'] = headers
        print('Fixed HTTP - IG Create Container: Added User Authorization header.')

    # Fix IG Publish Media
    elif name == 'HTTP - IG Publish Media':
        headers = params.setdefault('headerParameters', {}).setdefault('parameters', [])
        headers = [h for h in headers if h.get('name') != 'Authorization']
        headers.append({
            'name': 'Authorization',
            'value': f"Bearer {user_token}"
        })
        params['headerParameters']['parameters'] = headers
        print('Fixed HTTP - IG Publish Media: Added User Authorization header.')

    # Fix all Google Sheets update nodes
    elif n.get('type') == 'n8n-nodes-base.googleSheets' and params.get('operation') == 'update':
        cols = params.setdefault('columns', {})
        cols['matchingColumns'] = ['post_id']
        print(f"Set matchingColumns for node: {name}")

cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
conn.commit()
conn.close()
print("Workflow database commit successful!")
