FROM judge0/judge0:1.13.1

USER root

# Debian Buster (this image's base) is EOL and gone from the default apt
# mirrors; point at the archive so we can still install packages.
RUN sed -i \
      -e 's|deb.debian.org/debian|archive.debian.org/debian|g' \
      -e 's|security.debian.org/debian-security|archive.debian.org/debian-security|g' \
      /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends libseccomp-dev \
    && rm -rf /var/lib/apt/lists/*

# Judge0 1.13.1 bundles isolate 1.8.1 (2021), which only understands cgroup
# v1. Docker Desktop's WSL2 backend runs cgroup v2 exclusively (no v1
# fallback), so every submission fails with a sandbox init error. Build a
# current isolate (v2.7) instead, which has full cgroup v2 support.
#
# Buster's kernel headers predate a few syscalls (clone3, quotactl_fd,
# io_uring_setup) that the actual host kernel supports fine at runtime --
# compat.h just supplies the missing compile-time declarations so it builds.
COPY compat.h /tmp/isolate-build/compat.h
RUN git clone --depth 1 --branch v2.7 https://github.com/ioi/isolate.git /tmp/isolate-build/src \
    && cd /tmp/isolate-build/src \
    && make isolate CFLAGS_EXTRA="-include /tmp/isolate-build/compat.h" \
    && install -m 4755 -o root -g root isolate /usr/local/bin/isolate-real \
    && rm -rf /tmp/isolate-build

# isolate 2.x dropped the --cg-timing/--no-cg-timing flag that Judge0's Ruby
# code (app/jobs/isolate_job.rb) still passes on every invocation -- it's the
# only CLI incompatibility between 1.8.1 and 2.7. Rather than patch Judge0's
# application code, shim it out: isolate-real is the actual setuid binary,
# and this wrapper (a plain, non-setuid script) strips that one flag before
# exec'ing it -- setuid still applies correctly since it's evaluated against
# isolate-real's own file permissions at that execve(), not the script's.
COPY isolate-wrapper.sh /usr/local/bin/isolate
RUN chmod 755 /usr/local/bin/isolate

# isolate v2.7 uses a different config format (adds lock_root, etc.) than the
# v1.8.1 config Judge0 ships.
COPY isolate.conf /usr/local/etc/isolate

# Sets up cgroup v2 delegation at container start, then hands off to the
# image's original entrypoint (which itself execs the server/workers CMD).
COPY entrypoint-cgroup-fix.sh /usr/local/bin/entrypoint-cgroup-fix.sh
RUN chmod +x /usr/local/bin/entrypoint-cgroup-fix.sh

USER judge0
ENTRYPOINT ["/usr/local/bin/entrypoint-cgroup-fix.sh", "/api/docker-entrypoint.sh"]
# Declaring a new ENTRYPOINT resets any CMD inherited from the base image, so
# it has to be re-declared here too (workers' compose `command:` still
# overrides this as normal).
CMD ["/api/scripts/server"]
