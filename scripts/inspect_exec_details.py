import sqlite3, os, json, zlib

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    try:
        data = json.loads(raw)
    except Exception:
        data = json.loads(zlib.decompress(raw))

    item0 = data[0]
    res_data = item0.get('resultData')
    if isinstance(res_data, str):
        res_data = json.loads(res_data)
    run_data = res_data.get('runData', {})
    print("Executed nodes in 3629:")
    for k in run_data.keys():
        print("  -", k)
    
    # Check Has Due Posts
    has_due = run_data.get('Has Due Posts?')
    if has_due:
        print("Has Due Posts output:", has_due[0].get('data', {}).get('main'))

    tz_node = run_data.get('Timezone Converter & Due Filter')
    if tz_node:
        print("Timezone Converter output:", tz_node[0].get('data', {}).get('main'))

conn.close()
