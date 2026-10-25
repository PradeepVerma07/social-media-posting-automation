import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    # 44 is data of Sheet - Read Posts
    d44 = data[44]
    print("d44:", d44)
    main_idx = d44['main']
    main_data = data[int(main_idx)]
    print("main_data:", main_data)
    list_items = data[int(main_data[0])]
    print(f"Number of rows read from Sheet: {len(list_items)}")
    for item_idx in list_items:
        item = data[int(item_idx)]
        item_json = data[int(item['json'])]
        # resolve simple strings
        resolved = {}
        for k, v in item_json.items():
            if isinstance(v, str) and v.isdigit() and int(v) < len(data):
                resolved[k] = data[int(v)]
            else:
                resolved[k] = v
        print("Sheet Post Row:", resolved.get('post_id'), resolved.get('status'), resolved.get('schedule_date'), resolved.get('schedule_time'))

conn.close()
