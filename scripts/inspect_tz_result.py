import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    tz_runs = data[int(data[2]['runData'])].get('Timezone Converter & Due Filter')
    tz_run_obj = data[int(tz_runs[0])]
    d_tz = data[int(tz_run_obj['data'])]
    main_tz = data[int(d_tz['main'])]
    items_tz = data[int(main_tz[0])]
    for it in items_tz:
        item = data[int(it)]
        item_json = data[int(item['json'])]
        resolved = {}
        for k, v in item_json.items():
            if isinstance(v, str) and v.isdigit() and int(v) < len(data):
                resolved[k] = data[int(v)]
            else:
                resolved[k] = v
        print("Timezone Converter Result Summary:")
        print("  dueCount:", resolved.get('dueCount'))
        print("  skippedCount:", resolved.get('skippedCount'))
        print("  invalidCount:", resolved.get('invalidCount'))
        print("  executedAt:", resolved.get('executedAt'))

conn.close()
