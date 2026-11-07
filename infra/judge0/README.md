# Judge0 (self-hosted)

Runs student code for the Compiler tab (`POST /api/v1/execute` in the
backend). Self-hosted instead of the RapidAPI-hosted Judge0, since the
hosted option is paid beyond a small free tier.

> Running the whole app via the root [`docker compose up --build`](../../README.md)?
> That already handles all of this — secrets come from the root `.env` (see
> `.env.example`) instead of the manual setup below. This page is only for
> running Judge0 standalone, or for native (non-Docker) backend dev.

## Setup

```bash
cp judge0.conf.example judge0.conf
```

Edit `judge0.conf` and set `REDIS_PASSWORD`, `POSTGRES_PASSWORD`, and
`AUTHN_TOKEN` to your own generated secrets (e.g.
`python -c "import secrets; print(secrets.token_urlsafe(24))"`).
`AUTHN_TOKEN` must match `backend/.env`'s `JUDGE0_AUTH_TOKEN`.

```bash
docker compose up -d
```

First run builds a custom image (see below) and pulls Postgres/Redis — takes
a few minutes. The API listens on `http://localhost:2358`, bound to
`127.0.0.1` only.

Verify it's up:

```bash
curl -H "X-Auth-Token: <your AUTHN_TOKEN>" http://localhost:2358/about
```

## Why there's a custom Dockerfile

The stock `judge0/judge0:1.13.1` image doesn't work under Docker Desktop's
WSL2 backend, for two independent reasons — both fixed here, not upstream:

1. **cgroup v1 vs v2.** Judge0 1.13.1 bundles `isolate` 1.8.1 (2021), whose
   sandboxing only understands the legacy cgroup v1 hierarchy. Docker
   Desktop's WSL2 VM runs cgroup v2 exclusively (confirmed: no v1 fallback,
   and `systemd.unified_cgroup_hierarchy=0` in `.wslconfig` has no effect —
   Docker Desktop's inner VM doesn't use systemd for cgroup mounting, so
   that flag is simply never read). Every submission failed with
   `isolate: Failed to create control group ... No such file or directory`.

   Fix: the Dockerfile builds `isolate` v2.7 from source (full cgroup v2
   support) and installs it as `/usr/local/bin/isolate-real`, setuid root
   like the original. Debian Buster's kernel headers predate a few syscalls
   isolate 2.x uses (`clone3`, `quotactl_fd`, `io_uring_setup`) — the actual
   WSL2 kernel supports them fine at runtime, Buster's headers just don't
   declare them at compile time, so `compat.h` supplies the missing
   declarations to get it to build.

2. **cgroup v2 delegation.** Even with a v2-aware `isolate`, cgroup v2's "no
   internal processes" rule blocks a cgroup from both holding processes
   directly *and* delegating controllers to children — which is exactly
   what a plain Docker container is by default. `entrypoint-cgroup-fix.sh`
   moves the container's own processes into a `/sys/fs/cgroup/init`
   subgroup at boot, then enables delegation (`cgroup.subtree_control`) so
   `isolate` can create sibling `box-N` cgroups. This has to run at
   container *start* (it operates on live PIDs), not image build time.

3. **CLI drift.** isolate 2.0 also removed `--cg-timing`/`--no-cg-timing` —
   Judge0 1.13.1's Ruby code (`app/jobs/isolate_job.rb`) still passes it on
   every invocation. `isolate-wrapper.sh` is a thin non-setuid shim
   installed as `/usr/local/bin/isolate` that strips just that one flag and
   execs the real (setuid) binary — setuid still applies correctly since
   it's evaluated at the real binary's own `execve()`, not the wrapper's.
   Everything else Judge0 passes (`--cg`, `-b`, `--cg-mem=`, etc.) is
   unchanged between 1.8.1 and 2.7.

`isolate.conf` (replacing Judge0's bundled 1.8.1-era config) uses isolate
2.x's format, which added a required `lock_root` directive.

If Docker Desktop ever ships cgroup v1 support again, or Judge0 upstream
bumps its bundled isolate, this whole Dockerfile can likely be deleted in
favor of the stock image.

## Language IDs in use

Only C++, Java, JavaScript, and Python are wired up (see
`backend/app/judge0.py`). Judge0 supports far more; extend the `LANGUAGE_IDS`
map there (and the frontend's language list in `Compiler.tsx`) to add more.
