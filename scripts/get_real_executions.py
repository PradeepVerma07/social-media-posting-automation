import sqlite3, os, json, sys
from datetime import datetime, timezone, timedelta

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 30
db_path = os.path.expanduser('~/.n8n/database.sqlite')
ist = timezone(timedelta(hours=5, minutes=30))

def to_iso_utc(ts_str):
    if not ts_str:
        return None
    s = str(ts_str).strip().replace(' ', 'T')
    if not s.endswith('Z') and '+' not in s:
        s += 'Z'
    return s

def to_ist_formatted(ts_str):
    if not ts_str:
        return None, None
    try:
        iso_str = to_iso_utc(ts_str)
        t_utc = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        t_ist = t_utc.astimezone(ist)
        # e.g. "Oct 25, 02:15:40" and "02:15:40"
        return t_ist.strftime('%b %d, %H:%M:%S'), t_ist.strftime('%H:%M:%S')
    except Exception:
        return None, None

try:
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    cur = conn.cursor()
    cur.execute('''
        SELECT 
            e.id, 
            e.workflowId, 
            COALESCE(w.name, e.workflowId) as wf_name, 
            e.status, 
            e.startedAt, 
            e.stoppedAt
        FROM execution_entity e 
        LEFT JOIN workflow_entity w ON e.workflowId = w.id 
        ORDER BY e.id DESC 
        LIMIT ?
    ''', (limit,))
    rows = cur.fetchall()

    results = []
    for r in rows:
        exec_id = r[0]
        wf_id = r[1]
        wf_name = r[2]
        raw_status = r[3]
        started = r[4]
        stopped = r[5]

        duration = 0
        started_iso = to_iso_utc(started)
        stopped_iso = to_iso_utc(stopped)

        if started and stopped:
            try:
                t0 = datetime.fromisoformat(started_iso.replace('Z', '+00:00'))
                t1 = datetime.fromisoformat(stopped_iso.replace('Z', '+00:00'))
                duration = int((t1 - t0).total_seconds() * 1000)
            except Exception:
                pass

        started_ist_dt, started_ist_time = to_ist_formatted(started)
        stopped_ist_dt, _ = to_ist_formatted(stopped)

        mapped_status = 'success' if raw_status == 'success' else ('failed' if raw_status in ['error', 'crashed'] else 'running')

        results.append({
            'id': exec_id,
            'executionId': str(exec_id),
            'workflowId': wf_id,
            'workflowName': wf_name,
            'status': mapped_status,
            'startedAt': started_iso,
            'finishedAt': stopped_iso,
            'startedAtIst': started_ist_dt,
            'startedAtIstTime': started_ist_time,
            'finishedAtIst': stopped_ist_dt,
            'durationMs': max(duration, 250),
            'brandId': 1,
            'brandName': 'Flower Plant',
            'postTitle': 'Automated Multi-Platform Sync',
            'perPlatformResults': {
                'facebook': {
                    'status': 'success' if mapped_status == 'success' else 'failed',
                    'url': 'https://facebook.com/1454740611044963'
                }
            }
        })

    conn.close()
    print(json.dumps(results))
except Exception as e:
    print(json.dumps([]))
