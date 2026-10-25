import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT nodes FROM workflow_entity WHERE id = 'Utaz0U82aZQZ7uHF'")
raw_nodes = cur.fetchone()[0]
nodes = json.loads(raw_nodes)

switch = next((n for n in nodes if n.get('name') == 'Switch Platform'), None)
if switch:
    switch['parameters'] = {
        "mode": "rules",
        "rules": {
            "values": [
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "facebook",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "instagram",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "threads",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "linkedin",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "x",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "youtube",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "pinterest",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                },
                {
                    "conditions": {
                        "options": {
                            "caseSensitive": False,
                            "leftValue": "",
                            "typeValidation": "loose",
                            "version": 2
                        },
                        "conditions": [
                            {
                                "leftValue": "={{ String($json.platform).toLowerCase() }}",
                                "rightValue": "tiktok",
                                "operator": {
                                    "type": "string",
                                    "operation": "equals"
                                }
                            }
                        ],
                        "combinator": "and"
                    }
                }
            ]
        },
        "options": {}
    }
    cur.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'Utaz0U82aZQZ7uHF'", (json.dumps(nodes),))
    conn.commit()
    print("Successfully populated Switch Platform rules!")

conn.close()
