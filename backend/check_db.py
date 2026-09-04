import sqlite3

con = sqlite3.connect("recovery_agent.db")
cur = con.cursor()

tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", tables)

for (table_name,) in tables:
    if table_name == "sqlite_sequence":
        continue
    print(f"\n--- {table_name} ---")
    cols = cur.execute(f"PRAGMA table_info({table_name})").fetchall()
    for col in cols:
        # col = (cid, name, type, notnull, dflt_value, pk)
        print(f"  {col[1]:25s} {col[2]:15s} {'PK' if col[5] else ''}")

con.close()