import subprocess, sys

print("=== Initializing PostgreSQL ===")

cmds = [
    ["sudo", "/usr/bin/initdb", "-D", "/var/lib/postgres/data"],
    ["sudo", "/usr/bin/pg_ctl", "-D", "/var/lib/postgres/data", "-l", "/var/lib/postgres/logfile", "-o", "-c", "unix_socket_directories=/run/postgresql", "start"],
]

for cmd in cmds:
    print(f"\nRunning: {' '.join(cmd)}")
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    print(r.stdout[:1000] if r.stdout else "")
    print(r.stderr[:500] if r.stderr else "")
    print(f"exit: {r.returncode}")
