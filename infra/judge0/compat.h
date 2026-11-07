#ifndef ISOLATE_COMPAT_H
#define ISOLATE_COMPAT_H
/* Shim for Debian Buster's outdated kernel headers. The running kernel
   (WSL2) supports all of this at runtime; Buster's linux-libc-dev headers
   just predate it. Values match upstream Linux uapi headers. */
#include <stdint.h>
#include <sys/syscall.h>

#ifndef SYS_clone3
#define SYS_clone3 435
#endif

#ifndef SYS_quotactl_fd
#define SYS_quotactl_fd 443
#endif

#ifndef __NR_io_uring_setup
#define __NR_io_uring_setup 425
#endif

#ifndef CLONE_INTO_CGROUP
#define CLONE_INTO_CGROUP 0x200000000ULL
#endif

#ifndef _LINUX_SCHED_H_CLONE_ARGS
#define _LINUX_SCHED_H_CLONE_ARGS
struct clone_args {
	uint64_t flags;
	uint64_t pidfd;
	uint64_t child_tid;
	uint64_t parent_tid;
	uint64_t exit_signal;
	uint64_t stack;
	uint64_t stack_size;
	uint64_t tls;
	uint64_t set_tid;
	uint64_t set_tid_size;
	uint64_t cgroup;
};
#endif

#endif
