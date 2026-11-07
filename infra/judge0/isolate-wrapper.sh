#!/bin/bash
# Judge0 1.13.1's Ruby code (app/jobs/isolate_job.rb) still passes
# --cg-timing/--no-cg-timing on every isolate invocation. isolate 2.x removed
# that flag entirely -- in control-group mode this kind of timing is always
# used now, so the switch became meaningless (see isolate's NEWS for v2.0).
# Every other flag Judge0 passes (--cg, -b, --init, -M, --cg-mem=, etc.) is
# still valid 2.x syntax.
# Security Invariant: Also drop --share-net to enforce strict network egress isolation.
args=()
for arg in "$@"; do
  case "$arg" in
    --cg-timing | --no-cg-timing | --share-net) ;;
    *) args+=("$arg") ;;
  esac
done
exec /usr/local/bin/isolate-real "${args[@]}"
