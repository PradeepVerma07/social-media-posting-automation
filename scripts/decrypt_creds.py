import sqlite3, os, json, base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# Read encryptionKey from ~/.n8n/config
config_path = os.path.expanduser('~/.n8n/config')
with open(config_path, 'r') as f:
    cfg = json.load(f)
key_str = cfg['encryptionKey']

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT data FROM credentials_entity WHERE id = 'kCwnWgNcq5lsTVNX'")
enc_data = cur.fetchone()[0]
conn.close()

# n8n decrypts credentials using AES-256-CBC or AES-256-GCM
# Format is usually iv:ciphertext or json with iv, data
print("enc_data preview:", enc_data[:60])
