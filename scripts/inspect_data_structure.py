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

    if isinstance(data, list):
        print(f"data is a list of length {len(data)}")
        for idx, item in enumerate(data):
            if isinstance(item, dict):
                print(f"Item {idx} keys: {list(item.keys())}")
                if 'resultData' in item:
                    rd = item['resultData'].get('runData', {})
                    print("runData keys:", list(rd.keys()))
            else:
                print(f"Item {idx} type: {type(item)}")
    elif isinstance(data, dict):
        print("data is dict, keys:", list(data.keys()))
        rd = data.get('resultData', {}).get('runData', {})
        print("runData keys:", list(rd.keys()))

conn.close()
