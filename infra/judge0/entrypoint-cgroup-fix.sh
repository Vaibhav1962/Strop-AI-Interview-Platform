#!/bin/bash
# Judge0 1.13.1 bundles isolate 1.8.1, which predates cgroup v2 and doesn't
# work under Docker Desktop's WSL2 backend (cgroup v2 only, no v1 fallback
# available there). The image gets a rebuilt isolate v2.7 instead (see
# Dockerfile), but isolate v2.7 still needs the cgroup v2 "delegation" set up
# before it can create sibling cgroups for sandboxes: the cgroup v2 "no
# internal processes" rule means a cgroup can't both hold processes directly
# AND delegate controllers to children, so this container's own processes
# have to move into a subgroup before /sys/fs/cgroup can enable delegation.
# This has to happen at container start (it operates on live PIDs), not at
# image build time, hence doing it here rather than in the Dockerfile.
sudo mkdir -p /run/isolate/locks
sudo bash -c '
  # Newer Docker Desktop builds mount /sys/fs/cgroup read-only for non-privileged containers, which makes
  # isolate fail with "Failed to create control group ... Read-only file system". Remount it writable
  # (needs SYS_ADMIN).
  mount -o remount,rw /sys/fs/cgroup 2>/dev/null || true
  mkdir -p /sys/fs/cgroup/init
  for pid in $(cat /sys/fs/cgroup/cgroup.procs); do
    echo "$pid" > /sys/fs/cgroup/init/cgroup.procs 2>/dev/null || true
  done
  echo "+cpuset +cpu +io +memory +pids" > /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null || true
'

sudo cron
exec "$@"
