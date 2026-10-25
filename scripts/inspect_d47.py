import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    d47 = data[47]
    main47 = data[int(d47['main'])]
    items47 = data[int(main47[0])]
    for it in items47:
        item = data[int(it)]
        item_json = data[int(item['json'])]
        resolved = {}
        for k, v in item_json.items():
            if isinstance(v, str) and v.isdigit() and int(v) < len(data):
                val = data[int(v)]
                resolved[k] = val
            else:
                resolved[k] = v
        print("Timezone Converter Output:", resolved)

conn.close()
