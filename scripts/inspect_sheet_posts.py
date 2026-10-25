import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    # Check Sheet - Read Posts
    posts_idx = data[int(data[2]['runData'])].get('Sheet - Read Posts')
    if posts_idx:
        posts_run = data[int(posts_idx[0])]
        posts_data = data[int(posts_run['data'])]['main']
        posts_list = data[int(posts_data[0])]
        print(f"Sheet - Read Posts output {len(posts_list)} rows:")
        for r_idx in posts_list:
            r = data[int(r_idx)]
            json_obj = data[int(r['json'])]
            print("Row:", {k: data[int(v)] if isinstance(v, str) and v.isdigit() else v for k, v in json_obj.items()})

    # Check Timezone Converter output
    tz_idx = data[int(data[2]['runData'])].get('Timezone Converter & Due Filter')
    if tz_idx:
        tz_run = data[int(tz_idx[0])]
        tz_data = data[int(tz_run['data'])]['main']
        tz_list = data[int(tz_data[0])]
        for t_idx in tz_list:
            t = data[int(t_idx)]
            json_obj = data[int(t['json'])]
            print("Timezone Converter JSON output:", {k: data[int(v)] if isinstance(v, str) and v.isdigit() else v for k, v in json_obj.items()})

conn.close()
