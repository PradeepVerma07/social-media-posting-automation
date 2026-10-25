import sqlite3, os, json, zlib

# flatted unpacker
def unflatten(flat):
    if not isinstance(flat, list):
        return flat
    
    def resolve(idx):
        if idx is None:
            return None
        val = flat[idx]
        if isinstance(val, (int, float, bool)) or val is None:
            return val
        if isinstance(val, str):
            return val
        if isinstance(val, list):
            return [resolve(i) for i in val]
        if isinstance(val, dict):
            return {k: resolve(int(v) if isinstance(v, str) and v.isdigit() else v) for k, v in val.items()}
        return val

    # In flatted, 0 is root
    return flat[0]

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    print("Flatted indices 1, 2, 3:")
    print("1:", data[1])
    print("2:", data[2])
    print("3:", data[3])
conn.close()
