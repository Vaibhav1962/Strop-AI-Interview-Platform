"""Core CS Curated Question Catalog.
Total Questions: 111
"""

from typing import Any

CORE_CS_CATALOG: list[dict[str, Any]] = [
  {
    "id": "os-process-vs-thread",
    "title": "Process vs Thread Architecture & Context Switching Cost",
    "topic": "Operating Systems",
    "subtopic": "Process Management",
    "difficulty": "Medium",
    "prompt": "Explain the architectural differences between processes and threads in Linux, and detail what happens at the hardware and kernel level during a context switch.",
    "context_scenario": "Address spaces, file descriptor tables, PCB vs TCB, CPU register saving, TLB invalidation.",
    "expected_signals": [
      "processes have isolated virtual address spaces; threads within a process share code, data, heap, and file descriptors",
      "context switch between processes invalidates TLB (Translation Lookaside Buffer) entries leading to heavy cache misses",
      "thread switch within same process preserves page directory base register (CR3 on x86) avoiding TLB flush",
      "kernel saves CPU general purpose registers, program counter, stack pointer into PCB/TCB"
    ],
    "follow_up_probes": [
      "Why is a thread context switch significantly faster than a process context switch in terms of memory cache performance?",
      "What is Linux's 1:1 threading model (NPTL) and how does clone() syscall unify process and thread creation?"
    ],
    "question_family": "Process Management",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-virtual-memory-paging",
    "title": "Virtual Memory, Multi-Level Page Tables & TLB Shootdown",
    "topic": "Operating Systems",
    "subtopic": "Memory Management",
    "difficulty": "Senior",
    "prompt": "Walk me through the complete journey of memory translation from a 64-bit virtual address to physical RAM on x86-64, and explain TLB shootdown in multi-core systems.",
    "context_scenario": "Page size 4KB, 4-level page table (PML4, PDPT, PD, PT), CR3 register, page faults, TLB.",
    "expected_signals": [
      "virtual address split into PML4, PDPT, PD, PT offsets and 12-bit physical page offset",
      "CR3 holds physical base address of PML4; MMU traverses 4 levels of page tables",
      "TLB caches virtual-to-physical translations to avoid 4 memory lookups per access",
      "TLB shootdown: when a page table entry is modified, the kernel sends Inter-Processor Interrupts (IPIs) to all other cores to invalidate their local TLBs"
    ],
    "follow_up_probes": [
      "What happens when the present bit in a Page Table Entry is 0? Trace the major page fault execution path.",
      "How do Huge Pages (2MB or 1GB) dramatically improve memory throughput in high-performance databases?"
    ],
    "question_family": "Memory Management",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-cpu-scheduling-cfs",
    "title": "Linux CFS (Completely Fair Scheduler) & Virtual Runtime",
    "topic": "Operating Systems",
    "subtopic": "CPU Scheduling",
    "difficulty": "Senior",
    "prompt": "How does the Linux Completely Fair Scheduler (CFS) allocate CPU time among processes, and how does it prevent starvation?",
    "context_scenario": "Red-Black Tree, vruntime (virtual runtime), nice values, latency target, min_vruntime.",
    "expected_signals": [
      "CFS models an 'ideal multi-tasking CPU' giving each runnable process equal slice of compute",
      "processes ordered in a Red-Black Tree keyed by virtual runtime (vruntime)",
      "vruntime advances proportional to actual execution time weighted by process nice value (prio_to_weight array)",
      "CFS always picks leftmost node in RB-tree (smallest vruntime) to guarantee fairness and eliminate starvation"
    ],
    "follow_up_probes": [
      "What happens to the vruntime of a sleeping process when it suddenly wakes up (e.g. after I/O)? How does min_vruntime prevent CPU monopolization?",
      "How does CFS handle latency-sensitive interactive tasks versus batch background tasks?"
    ],
    "question_family": "CPU Scheduling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-epoll-vs-select",
    "title": "Linux I/O Multiplexing: epoll vs select and poll",
    "topic": "Operating Systems",
    "subtopic": "I/O & Networking",
    "difficulty": "Medium",
    "prompt": "Compare select, poll, and epoll in Linux. Why does epoll scale to C10K/C100K concurrent connections while select collapses?",
    "context_scenario": "File descriptor limits (FD_SETSIZE 1024), linear scan O(N) vs event-driven O(1), kernel-user buffer copying.",
    "expected_signals": [
      "select and poll pass the entire array/bitmask of file descriptors into the kernel on every call: O(N) copy overhead and O(N) scan",
      "epoll uses epoll_create to register an eventpoll structure in the kernel (Red-Black tree of watched FDs + ready list)",
      "epoll_ctl adds/modifies FDs in O(log N); callbacks from device driver add ready FDs directly to the ready list",
      "epoll_wait sleeps until ready list is non-empty, returning only active events in O(ready_events) without scanning idle connections"
    ],
    "follow_up_probes": [
      "Explain the critical behavioral difference between epoll Level-Triggered (LT) and Edge-Triggered (ET) modes.",
      "Why must file descriptors registered with Edge-Triggered epoll be configured in non-blocking mode (O_NONBLOCK)?"
    ],
    "question_family": "I/O & Networking",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-io-uring",
    "title": "Linux io_uring vs Synchronous I/O & epoll",
    "topic": "Operating Systems",
    "subtopic": "I/O Internals",
    "difficulty": "Senior",
    "prompt": "What architectural limitations of epoll and POSIX AIO led to the design of io_uring, and how does io_uring achieve zero syscall overhead?",
    "context_scenario": "Submission Queue (SQ), Completion Queue (CQ), lock-free ring buffers in shared memory, SQPOLL kernel thread.",
    "expected_signals": [
      "epoll only supports network sockets and pipes; regular disk file I/O does NOT work with epoll (regular files are always 'ready')",
      "io_uring allocates two ring buffers (Submission Queue and Completion Queue) in shared memory mapped between user and kernel space",
      "user submits batch I/O requests to SQ and consumes results from CQ without calling syscalls per operation",
      "with IORING_SETUP_SQPOLL, a dedicated kernel thread polls the submission queue, allowing I/O with absolute zero syscall context switches"
    ],
    "follow_up_probes": [
      "Why could Linux epoll never support true asynchronous disk file I/O?",
      "How does io_uring handle registered fixed buffers (IORING_REGISTER_BUFFERS) to bypass virtual memory page pin/unpin overhead?"
    ],
    "question_family": "I/O Internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-fork-exec-cow",
    "title": "Process Creation: fork(), exec(), and Copy-On-Write (COW)",
    "topic": "Operating Systems",
    "subtopic": "Process Management",
    "difficulty": "Medium",
    "prompt": "What happens in memory when a process calls fork() followed by exec()? Explain the role of Copy-On-Write (COW).",
    "context_scenario": "Duplication of page tables, read-only protection bits, page fault handler, address space replacement.",
    "expected_signals": [
      "fork() does NOT duplicate physical memory pages; it only clones the parent's page tables and file descriptor table",
      "all writable pages in both parent and child are marked read-only in their page table entries",
      "when either process writes to a page, a hardware protection page fault is triggered; kernel allocates new physical frame, copies 4KB data, updates page table to writable",
      "exec() destroys the old address space, unmaps pages, loads the new ELF executable binary, and resets stack and heap"
    ],
    "follow_up_probes": [
      "Why would a database like Redis using BGSAVE background snapshotting suffer severe latency if fork() did not use Copy-On-Write?",
      "What happens to open file descriptors and socket connections across a fork() and exec() call if O_CLOEXEC is not set?"
    ],
    "question_family": "Process Management",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-ipc-mechanisms",
    "title": "Inter-Process Communication: Pipes, Sockets, and Shared Memory",
    "topic": "Operating Systems",
    "subtopic": "IPC & Concurrency",
    "difficulty": "Medium",
    "prompt": "Compare Unix domain sockets, anonymous pipes, and POSIX shared memory (shm_open / mmap). When should you choose each?",
    "context_scenario": "Kernel-space buffer copying vs zero-copy shared memory, synchronization primitives, stream vs datagram semantics.",
    "expected_signals": [
      "anonymous pipes provide unidirectional byte streams between related processes (parent/child) via kernel ring buffer",
      "Unix domain sockets support bidirectional stream or datagram IPC with file system access control and passing open file descriptors via SCM_RIGHTS",
      "shared memory provides zero-copy memory access where both processes read/write same physical RAM directly",
      "shared memory requires explicit inter-process synchronization (named semaphores or pthread_mutex with PTHREAD_PROCESS_SHARED)"
    ],
    "follow_up_probes": [
      "Why is shared memory the fastest IPC mechanism, and what is its primary engineering drawback?",
      "How does passing a file descriptor over a Unix domain socket work under the hood in the Linux kernel?"
    ],
    "question_family": "IPC & Concurrency",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-memory-allocator",
    "title": "Memory Allocator Internals: glibc ptmalloc, brk, and mmap",
    "topic": "Operating Systems",
    "subtopic": "Memory Management",
    "difficulty": "Senior",
    "prompt": "How does glibc ptmalloc implement malloc() and free()? When does it use brk() vs mmap(), and how does it prevent heap fragmentation?",
    "context_scenario": "brk heap expansion, mmap anonymous pages, chunk metadata, bins (fastbins, unsorted bin, small bins, large bins), arenas.",
    "expected_signals": [
      "small allocations expand the process heap by moving the break pointer via brk() syscall",
      "large allocations exceeding MMAP_THRESHOLD (default 128KB) are allocated directly from kernel via mmap() anonymous memory",
      "mmap allocations are returned directly to kernel on free() via munmap(), avoiding process RSS bloat",
      "ptmalloc organizes freed memory into arenas and bins (fastbins LIFO single-linked list, small/large bins double-linked lists) with chunk coalescing"
    ],
    "follow_up_probes": [
      "Why can memory fragmentation prevent a process from releasing physical RAM back to the operating system even when free() is called?",
      "How do modern multi-threaded allocators like jemalloc or TCMalloc prevent global lock contention using thread-local caches?"
    ],
    "question_family": "Memory Management",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-deadlocks-coffman",
    "title": "Deadlock Conditions & Coffman Criteria",
    "topic": "Operating Systems",
    "subtopic": "Deadlock Conditions & Coffman Criteria",
    "difficulty": "Medium",
    "prompt": "Explain Deadlock Conditions & Coffman Criteria in modern Linux kernel architecture.",
    "context_scenario": "Mutual exclusion, Hold and wait, No preemption, Circular wait.",
    "expected_signals": [
      "core understanding of Deadlock Conditions & Coffman Criteria",
      "Mutual exclusion, Hold and wait, No preemption, Circular wait.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "How to break circular wait using lock ordering hierarchy.",
      "What are the common production failure modes?"
    ],
    "question_family": "Deadlock Conditions & Coffman Criteria",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-file-system-inodes",
    "title": "Linux File System Architecture: Inodes, Dentries & Hard vs Soft Links",
    "topic": "Operating Systems",
    "subtopic": "Linux File System Architecture",
    "difficulty": "Medium",
    "prompt": "Explain Linux File System Architecture: Inodes, Dentries & Hard vs Soft Links in modern Linux kernel architecture.",
    "context_scenario": "Inode table, data blocks, dentry cache, unlink behavior on open files.",
    "expected_signals": [
      "core understanding of Linux File System Architecture: Inodes, Dentries & Hard vs Soft Links",
      "Inode table, data blocks, dentry cache, unlink behavior on open files.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "Why a deleted file remains on disk until all open file descriptors close.",
      "What are the common production failure modes?"
    ],
    "question_family": "Linux File System Architecture",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-page-cache-dirty-pages",
    "title": "Linux Page Cache, Buffer Cache, and pdflush/flush Daemons",
    "topic": "Operating Systems",
    "subtopic": "Linux Page Cache, Buffer Cache, and pdflush/flush Daemons",
    "difficulty": "Medium",
    "prompt": "Explain Linux Page Cache, Buffer Cache, and pdflush/flush Daemons in modern Linux kernel architecture.",
    "context_scenario": "Dirty page writeback, fsync() vs fdatasync() vs sync(), write amplification.",
    "expected_signals": [
      "core understanding of Linux Page Cache, Buffer Cache, and pdflush/flush Daemons",
      "Dirty page writeback, fsync() vs fdatasync() vs sync(), write amplification.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "Why fsync failure must be handled with extreme care in PostgreSQL/SQLite.",
      "What are the common production failure modes?"
    ],
    "question_family": "Linux Page Cache, Buffer Cache, and pdflush/flush Daemons",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-signals-reentrancy",
    "title": "Linux Signal Handling, Async-Signal-Safety & Reentrancy",
    "topic": "Operating Systems",
    "subtopic": "Linux Signal Handling, Async-Signal-Safety & Reentrancy",
    "difficulty": "Medium",
    "prompt": "Explain Linux Signal Handling, Async-Signal-Safety & Reentrancy in modern Linux kernel architecture.",
    "context_scenario": "Signal masks, SA_RESTART, reentrant functions, why printf/malloc are unsafe in signal handlers.",
    "expected_signals": [
      "core understanding of Linux Signal Handling, Async-Signal-Safety & Reentrancy",
      "Signal masks, SA_RESTART, reentrant functions, why printf/malloc are unsafe in signal handlers.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "Safe IPC using self-pipe trick or signalfd with epoll.",
      "What are the common production failure modes?"
    ],
    "question_family": "Linux Signal Handling, Async-Signal-Safety & Reentrancy",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-cgroups-namespaces",
    "title": "Linux Containers Under the Hood: Namespaces and cgroups v2",
    "topic": "Operating Systems",
    "subtopic": "Linux Containers Under the Hood",
    "difficulty": "Medium",
    "prompt": "Explain Linux Containers Under the Hood: Namespaces and cgroups v2 in modern Linux kernel architecture.",
    "context_scenario": "PID, Mount, Net namespaces; cgroups memory, cpu limits, OOM killer triggers.",
    "expected_signals": [
      "core understanding of Linux Containers Under the Hood: Namespaces and cgroups v2",
      "PID, Mount, Net namespaces; cgroups memory, cpu limits, OOM killer triggers.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "How the Linux kernel isolates processes without virtualization.",
      "What are the common production failure modes?"
    ],
    "question_family": "Linux Containers Under the Hood",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "os-kernel-user-boundary",
    "title": "System Call Transitions & User vs Kernel Space Boundary",
    "topic": "Operating Systems",
    "subtopic": "System Call Transitions & User vs Kernel Space Boundary",
    "difficulty": "Medium",
    "prompt": "Explain System Call Transitions & User vs Kernel Space Boundary in modern Linux kernel architecture.",
    "context_scenario": "Ring 0 vs Ring 3, SYSENTER/SYSCALL instruction, kernel stack switch, Meltdown/Spectre KPTI.",
    "expected_signals": [
      "core understanding of System Call Transitions & User vs Kernel Space Boundary",
      "Ring 0 vs Ring 3, SYSENTER/SYSCALL instruction, kernel stack switch, Meltdown/Spectre KPTI.",
      "practical operational trade-offs"
    ],
    "follow_up_probes": [
      "Why user-to-kernel boundary crossings incur measurable CPU latency.",
      "What are the common production failure modes?"
    ],
    "question_family": "System Call Transitions & User vs Kernel Space Boundary",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Operating Systems"
    }
  },
  {
    "id": "db-isolation-levels",
    "title": "ANSI SQL vs Real-World Isolation Levels & Phenomena",
    "topic": "Database Systems",
    "subtopic": "Transactions & ACID",
    "difficulty": "Senior",
    "prompt": "Explain the ANSI SQL isolation levels and the anomalies they permit: Dirty Read, Non-Repeatable Read, Phantom Read, and Write Skew.",
    "context_scenario": "Read Uncommitted, Read Committed, Repeatable Read, Serializable, Snapshot Isolation.",
    "expected_signals": [
      "Read Committed prevents Dirty Reads by reading only committed versions; permits Non-Repeatable Reads",
      "Repeatable Read guarantees consistent snapshot within transaction, preventing Non-Repeatable Reads",
      "Phantom Reads occur when concurrent transactions insert rows matching a range query filter",
      "Snapshot Isolation prevents Phantom Reads but permits Write Skew anomaly (two transactions read disjoint data, update overlapping invariants)"
    ],
    "follow_up_probes": [
      "Why does PostgreSQL's 'Repeatable Read' implementation actually provide Snapshot Isolation?",
      "Provide a concrete financial or booking scenario where Write Skew corrupts business invariants under Snapshot Isolation."
    ],
    "question_family": "Transactions & ACID",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "db-mvcc-internals",
    "title": "Multi-Version Concurrency Control (MVCC) in PostgreSQL vs MySQL InnoDB",
    "topic": "Database Systems",
    "subtopic": "Storage & Concurrency",
    "difficulty": "Senior",
    "prompt": "How do PostgreSQL and MySQL InnoDB implement Multi-Version Concurrency Control (MVCC) differently, and what are the trade-offs of each approach?",
    "context_scenario": "PostgreSQL tuple header (xmin, xmax), vacuuming, bloat; MySQL undo logs, rollback segments, in-place update.",
    "expected_signals": [
      "PostgreSQL stores all tuple versions directly in table data pages (heap); updates create new row version and write xmax to old row",
      "PostgreSQL requires VACUUM / autovacuum to reclaim dead tuples, causing table/index bloat on write-heavy workloads",
      "MySQL InnoDB updates rows in-place in clustered B-Tree index, storing prior versions in undo log pages",
      "MySQL InnoDB rollback segments purge undo logs asynchronously, keeping tables compact but making long-running transactions expensive"
    ],
    "follow_up_probes": [
      "Why does PostgreSQL suffer from table bloat during high-throughput UPDATE traffic?",
      "How does PostgreSQL HOT (Heap-Only Tuple) optimization eliminate secondary index updates when indexed columns don't change?"
    ],
    "question_family": "Storage & Concurrency",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "db-btree-vs-lsm",
    "title": "B+ Trees vs Log-Structured Merge (LSM) Trees Storage Engines",
    "topic": "Database Systems",
    "subtopic": "Storage Engines",
    "difficulty": "Senior",
    "prompt": "Compare B+ Tree storage engines (PostgreSQL, InnoDB) with Log-Structured Merge (LSM) Tree engines (RocksDB, Cassandra).",
    "context_scenario": "Read amplification, write amplification, space amplification, random I/O vs sequential I/O, compaction.",
    "expected_signals": [
      "B+ Tree keeps sorted pages on disk; updates require random I/O writes and WAL logging (write amplification 10-30x)",
      "LSM Tree writes append-only to in-memory MemTable (SSTable flush to disk); all writes are sequential I/O",
      "LSM Tree suffers from read amplification (checking MemTable + Bloom filters + multiple SSTable levels on disk)",
      "LSM background compaction (leveled vs size-tiered) causes periodic I/O stalls but maximizes write throughput"
    ],
    "follow_up_probes": [
      "Why do LSM trees achieve significantly higher write throughput than B+ Trees on NVMe SSDs?",
      "How do Bloom filters mitigate read amplification in LSM-tree storage engines?"
    ],
    "question_family": "Storage Engines",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "db-wal-and-recovery",
    "title": "Write-Ahead Logging (WAL) & ARIES Recovery Algorithm",
    "topic": "Database Systems",
    "subtopic": "Recovery & Durability",
    "difficulty": "Staff",
    "prompt": "Explain the Write-Ahead Logging (WAL) protocol and the three phases of the ARIES database recovery algorithm.",
    "context_scenario": "Force/No-Force and Steal/No-Steal policies, LSN (Log Sequence Number), dirty page table, Analysis, Redo, Undo phases.",
    "expected_signals": [
      "WAL rule: log record describing a change must be flushed to non-volatile disk before the corresponding dirty data page is written to disk",
      "allows No-Force (don't flush dirty pages on commit) and Steal (can flush uncommitted dirty pages to disk)",
      "Analysis phase: scans log forward from last checkpoint to determine active transactions and dirty pages at time of crash",
      "Redo phase: repeats history, reapplying all logged operations from earliest un-checkpointed change forward to restore exact state",
      "Undo phase: scans backward rolling back active uncommitted transactions, writing Compensation Log Records (CLRs)"
    ],
    "follow_up_probes": [
      "Why are Compensation Log Records (CLRs) written during the Undo phase, and how do they prevent infinite rollback loops if the system crashes during recovery?",
      "How does group commit batch multiple concurrent transaction fsync() calls into a single disk write?"
    ],
    "question_family": "Recovery & Durability",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "db-indexing-execution-plans",
    "title": "B+ Tree Index Internals: Composite Indexes, Covering Indexes & Index Scans",
    "topic": "Database Systems",
    "subtopic": "Query Optimization",
    "difficulty": "Medium",
    "prompt": "How does a database query optimizer use B+ Tree indexes? Explain the leftmost prefix rule, index selectivity, and covering index scans.",
    "context_scenario": "Root, intermediate, and leaf nodes, clustered vs secondary index, Index Scan vs Bitmap Index Scan vs Sequential Scan.",
    "expected_signals": [
      "composite index (a, b, c) is sorted primarily by a, then by b, then by c; query filtering by (b, c) without a cannot use the index efficiently",
      "covering index includes all columns needed by the query, enabling Index-Only Scan without reading the table heap pages",
      "query optimizer calculates selectivity; if query matches > 15-20% of rows, cost model prefers full table sequential scan over random index lookups",
      "Bitmap Index Scan constructs an in-memory bitmap of matching page addresses before reading disk to convert random I/O to sequential page reads"
    ],
    "follow_up_probes": [
      "Why does an 'ORDER BY column DESC' query sometimes cause a catastrophic in-memory sort despite an index on that column?",
      "What is the difference between an Index Seek and an Index Scan in query plan execution?"
    ],
    "question_family": "Query Optimization",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "db-distributed-2pc",
    "title": "Two-Phase Commit (2PC) vs Sagas in Distributed Transactions",
    "topic": "Database Systems",
    "subtopic": "Distributed Transactions",
    "difficulty": "Senior",
    "prompt": "Compare Two-Phase Commit (2PC) with the Saga pattern for distributed transactions across multiple microservices or databases.",
    "context_scenario": "Coordinator, Prepare phase, Commit phase, blocking coordinator failure, compensating transactions, eventual consistency.",
    "expected_signals": [
      "2PC provides ACID consistency: Coordinator sends PREPARE to all cohorts; cohorts acquire locks and reply YES/NO; if all YES, coordinator sends COMMIT",
      "2PC is a blocking protocol: if the coordinator crashes after cohorts vote YES, cohorts must hold locks indefinitely, blocking all access",
      "Saga pattern breaks transaction into sequence of local transactions; if one fails, compensating transactions are executed in reverse order",
      "Sagas trade atomicity/isolation for availability; intermediate states are visible to other transactions (no isolation)"
    ],
    "follow_up_probes": [
      "How does 3PC (Three-Phase Commit) attempt to make 2PC non-blocking, and why is 3PC rarely used in practice over real networks?",
      "How do you implement idempotent compensating actions in a choreography-based Saga?"
    ],
    "question_family": "Distributed Transactions",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Database Systems"
    }
  },
  {
    "id": "net-tcp-handshake-teardown",
    "title": "TCP 3-Way Handshake, 4-Way FIN Teardown & TIME_WAIT",
    "topic": "Computer Networks",
    "subtopic": "Transport Layer",
    "difficulty": "Medium",
    "prompt": "Walk through the TCP 3-way handshake and 4-way teardown. Explain why the TIME_WAIT state exists and how socket exhaustion occurs.",
    "context_scenario": "SYN, SYN-ACK, ACK, ISN (Initial Sequence Number), FIN, ACK, 2MSL (Maximum Segment Lifetime), SO_REUSEADDR.",
    "expected_signals": [
      "handshake synchronizes ISNs: Client sends SYN(seq=x); Server replies SYN(seq=y)-ACK(x+1); Client sends ACK(y+1)",
      "teardown requires 4 packets because TCP is full-duplex: each direction terminates independently with FIN and ACK",
      "initiator of active close enters TIME_WAIT for 2MSL (typically 60-120 seconds)",
      "TIME_WAIT prevents delayed duplicate packets from prior connection corrupting a new connection using the same 4-tuple (source_ip, source_port, dest_ip, dest_port)",
      "high connection churn can exhaust all ~60,000 ephemeral ports if sockets linger in TIME_WAIT"
    ],
    "follow_up_probes": [
      "What happens during a SYN flood attack, and how do SYN Cookies (syncookies) mitigate it without allocating server memory?",
      "Why is enabling 'tcp_tw_recycle' dangerous in NAT environments?"
    ],
    "question_family": "Transport Layer",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Computer Networks"
    }
  },
  {
    "id": "net-tcp-congestion-control",
    "title": "TCP Congestion Control: Slow Start, Fast Retransmit, Cubic vs BBR",
    "topic": "Computer Networks",
    "subtopic": "Transport Layer",
    "difficulty": "Senior",
    "prompt": "How does TCP manage congestion? Contrast loss-based congestion control (Cubic) with delay/bandwidth-based congestion control (BBR).",
    "context_scenario": "CWND (Congestion Window), SSTHRESH, Slow Start, Congestion Avoidance, Fast Retransmit (3 duplicate ACKs), BBR bottleneck bandwidth and RTT.",
    "expected_signals": [
      "Slow Start exponentially doubles CWND every RTT until ssthresh, then switches to linear congestion avoidance",
      "loss-based algorithms (Reno, Cubic) treat packet drop as indication of buffer overflow at bottleneck router",
      "in modern networks with massive bufferbloat, loss-based algorithms fill up router buffers, inflating network RTT without increasing throughput",
      "Google BBR (Bottleneck Bandwidth and RTT) models maximum bottleneck delivery rate and minimum round-trip time, avoiding queue build-up"
    ],
    "follow_up_probes": [
      "Why does packet loss on wireless/satellite networks falsely throttle TCP Cubic's transmission rate?",
      "How does TCP Fast Retransmit detect packet loss before retransmission timeout (RTO) expires using 3 duplicate ACKs?"
    ],
    "question_family": "Transport Layer",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Computer Networks"
    }
  },
  {
    "id": "net-tls-handshake",
    "title": "TLS 1.2 vs TLS 1.3 Handshake & Cryptographic Guarantees",
    "topic": "Computer Networks",
    "subtopic": "Security & Cryptography",
    "difficulty": "Senior",
    "prompt": "Compare the TLS 1.2 and TLS 1.3 cryptographic handshakes. Explain 0-RTT session resumption and Perfect Forward Secrecy (PFS).",
    "context_scenario": "ClientHello, ServerHello, Diffie-Hellman Key Exchange, ECDHE, RSA key exchange removal, replay attacks.",
    "expected_signals": [
      "TLS 1.2 required 2 full round-trips (2-RTT) before application data could be sent; TLS 1.3 completes in 1-RTT",
      "TLS 1.3 mandates Ephemeral Elliptic Curve Diffie-Hellman (ECDHE), removing static RSA key exchange to guarantee Perfect Forward Secrecy",
      "Perfect Forward Secrecy ensures that compromise of server's private key does not allow retroactive decryption of past recorded sessions",
      "TLS 1.3 0-RTT allows client to send early application data in first flight using previous session keys, but is vulnerable to replay attacks"
    ],
    "follow_up_probes": [
      "Why are 0-RTT requests vulnerable to replay attacks, and why should non-idempotent HTTP requests (e.g. POST payment) NEVER be sent over 0-RTT?",
      "What is Server Name Indication (SNI) and Encrypted Client Hello (ECH)?"
    ],
    "question_family": "Security & Cryptography",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Computer Networks"
    }
  },
  {
    "id": "net-http-evolution",
    "title": "HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC Architecture)",
    "topic": "Computer Networks",
    "subtopic": "Application Layer",
    "difficulty": "Senior",
    "prompt": "Trace the evolution of HTTP from HTTP/1.1 to HTTP/2 and HTTP/3. Explain Head-of-Line (HoL) blocking at the application vs transport layers.",
    "context_scenario": "HTTP/1.1 pipelining, HTTP/2 binary framing, multiplexing, stream prioritization, HPACK, HTTP/3 UDP QUIC.",
    "expected_signals": [
      "HTTP/1.1 suffered from application-level HoL blocking: request must complete before next response on same TCP connection (resolved via multiple connections)",
      "HTTP/2 introduced binary framing layer: multiplexes concurrent bidirectional streams over single TCP connection with HPACK header compression",
      "HTTP/2 introduced transport-level TCP HoL blocking: single packet loss on TCP connection stalls ALL multiplexed streams until packet is retransmitted",
      "HTTP/3 replaces TCP with QUIC over UDP: each stream has independent loss recovery; packet loss on stream A does not block stream B"
    ],
    "follow_up_probes": [
      "Why is connection migration seamless in QUIC when a client switches from Wi-Fi to cellular data?",
      "How does HPACK prevent CRIME attacks on HTTP headers while achieving high compression ratios?"
    ],
    "question_family": "Application Layer",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Computer Networks"
    }
  },
  {
    "id": "conc-memory-models",
    "title": "Hardware Memory Models: x86 TSO vs ARM Weak Memory & Fences",
    "topic": "Concurrency & Hardware",
    "subtopic": "Hardware & Concurrency",
    "difficulty": "Staff",
    "prompt": "Explain the difference between x86 Total Store Order (TSO) and ARM's weakly-ordered memory model. What are memory barriers/fences?",
    "context_scenario": "Store-Load reordering, hardware write buffers, memory consistency, acquire-release semantics, MFENCE, DMB.",
    "expected_signals": [
      "x86 provides Total Store Order (TSO): hardware guarantees all cores see writes in program order except Store-Load reordering (write buffer)",
      "ARM provides weak memory ordering: hardware can reorder Store-Store, Load-Load, Load-Store, and Store-Load unless explicit memory barriers are inserted",
      "memory barriers prevent compiler and CPU from reordering instructions across the boundary",
      "Acquire semantics ensure subsequent reads/writes cannot be reordered before the acquire; Release semantics ensure prior reads/writes cannot be reordered after"
    ],
    "follow_up_probes": [
      "Why does lock-free code that runs reliably on an x86 server silently suffer race conditions when deployed on an Apple Silicon or AWS Graviton ARM server?",
      "Explain the double-checked locking singleton bug in Java/C++ when volatile / memory fence is omitted."
    ],
    "question_family": "Hardware & Concurrency",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Concurrency & Hardware"
    }
  },
  {
    "id": "conc-atomic-cas-locks",
    "title": "Lock-Free Primitives: CAS, ABA Problem & Spinlocks vs Futexes",
    "topic": "Concurrency & Hardware",
    "subtopic": "Lock-Free & Primitives",
    "difficulty": "Senior",
    "prompt": "How do Compare-And-Swap (CAS) primitives work at the CPU assembly level? Explain the ABA problem and how Linux futexes implement mutexes.",
    "context_scenario": "LOCK CMPXCHG instruction, cache line locking (MESI protocol), ABA problem, tagged pointers, futex syscall.",
    "expected_signals": [
      "CAS (Compare-And-Swap) atomically tests if memory location contains expected value; if true, sets new value and returns true",
      "x86 executes LOCK CMPXCHG: asserts bus lock or uses MESI cache coherence protocol to gain exclusive ownership of cache line during modification",
      "ABA problem: thread reads value A, gets preempted; other thread changes A -> B -> A; first thread's CAS succeeds despite state having changed",
      "ABA solved using tagged pointers (pairing pointer with 64-bit monotonically increasing version counter)",
      "Linux futex (fast userspace mutex) attempts atomic CAS in user space; only issues futex() syscall to sleep if lock is contested"
    ],
    "follow_up_probes": [
      "Why is a pure spinlock disastrous in user space with preemptive CPU scheduling?",
      "How does a cache-friendly ticket lock or MCS lock eliminate cache line bouncing in multi-core CPU architectures?"
    ],
    "question_family": "Lock-Free & Primitives",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Concurrency & Hardware"
    }
  },
  {
    "id": "conc-false-sharing",
    "title": "False Sharing in Multi-Core CPU Caches & Cache Coherence",
    "topic": "Concurrency & Hardware",
    "subtopic": "Hardware & Concurrency",
    "difficulty": "Senior",
    "prompt": "What is false sharing in multi-threaded programs? How does the MESI cache coherence protocol cause CPU stalls, and how do you prevent it?",
    "context_scenario": "64-byte cache line, MESI (Modified, Exclusive, Shared, Invalid), cache line bouncing, CPU padding.",
    "expected_signals": [
      "CPU caches memory in 64-byte cache lines; multiple independent variables located within the same 64-byte line share the line",
      "when Core 1 writes to variable A, the MESI protocol invalidates the entire cache line across all other cores",
      "when Core 2 reads variable B on the same cache line, it suffers a cache miss and must reload the line from L3 cache or RAM",
      "results in cache line bouncing and catastrophic performance collapse despite threads working on completely different variables",
      "prevention: align variables to 64-byte boundaries or insert padding bytes (e.g. Java @Contended, C++ alignas(64))"
    ],
    "follow_up_probes": [
      "How can you diagnose false sharing in production using Linux perf or hardware performance counters (perf c2c)?",
      "Explain the four states of the MESI cache coherence protocol."
    ],
    "question_family": "Hardware & Concurrency",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "subject": "Concurrency & Hardware"
    }
  },
  {
    "id": "os-deadlock-detection-fundamental",
    "title": "Deadlock Detection vs Deadlock Prevention in Kernels (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Deadlock Detection vs Deadlock Prevention in Kernels in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Banker's Algorithm, resource allocation graphs, cycle detection.",
    "expected_signals": [
      "accurate explanation of Deadlock Detection vs Deadlock Prevention in Kernels",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-deadlock-detection",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-deadlock-detection-senior-architectural",
    "title": "Deadlock Detection vs Deadlock Prevention in Kernels (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Deadlock Detection vs Deadlock Prevention in Kernels in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Banker's Algorithm, resource allocation graphs, cycle detection.",
    "expected_signals": [
      "accurate explanation of Deadlock Detection vs Deadlock Prevention in Kernels",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-deadlock-detection",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-deadlock-detection-deep-scenario",
    "title": "Deadlock Detection vs Deadlock Prevention in Kernels (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Deadlock Detection vs Deadlock Prevention in Kernels in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Banker's Algorithm, resource allocation graphs, cycle detection.",
    "expected_signals": [
      "accurate explanation of Deadlock Detection vs Deadlock Prevention in Kernels",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-deadlock-detection",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-mmap-internals-fundamental",
    "title": "Memory Mapped Files (mmap) vs Standard Read/Write Syscalls (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Zero-copy reads, page faults, dirty page writeback, page cache mapping.",
    "expected_signals": [
      "accurate explanation of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-mmap-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-mmap-internals-senior-architectural",
    "title": "Memory Mapped Files (mmap) vs Standard Read/Write Syscalls (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Zero-copy reads, page faults, dirty page writeback, page cache mapping.",
    "expected_signals": [
      "accurate explanation of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-mmap-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-mmap-internals-deep-scenario",
    "title": "Memory Mapped Files (mmap) vs Standard Read/Write Syscalls (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Zero-copy reads, page faults, dirty page writeback, page cache mapping.",
    "expected_signals": [
      "accurate explanation of Memory Mapped Files (mmap) vs Standard Read/Write Syscalls",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-mmap-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-cpu-affinity-numa-fundamental",
    "title": "NUMA (Non-Uniform Memory Access) & CPU Core Affinity (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of NUMA (Non-Uniform Memory Access) & CPU Core Affinity in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Local vs remote node memory access latency, numactl, thread pinning.",
    "expected_signals": [
      "accurate explanation of NUMA (Non-Uniform Memory Access) & CPU Core Affinity",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-cpu-affinity-numa",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-cpu-affinity-numa-senior-architectural",
    "title": "NUMA (Non-Uniform Memory Access) & CPU Core Affinity (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of NUMA (Non-Uniform Memory Access) & CPU Core Affinity in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Local vs remote node memory access latency, numactl, thread pinning.",
    "expected_signals": [
      "accurate explanation of NUMA (Non-Uniform Memory Access) & CPU Core Affinity",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-cpu-affinity-numa",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-cpu-affinity-numa-deep-scenario",
    "title": "NUMA (Non-Uniform Memory Access) & CPU Core Affinity (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of NUMA (Non-Uniform Memory Access) & CPU Core Affinity in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Local vs remote node memory access latency, numactl, thread pinning.",
    "expected_signals": [
      "accurate explanation of NUMA (Non-Uniform Memory Access) & CPU Core Affinity",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-cpu-affinity-numa",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-real-time-scheduling-fundamental",
    "title": "Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Deterministic execution latency, priority inversion, priority inheritance mutexes.",
    "expected_signals": [
      "accurate explanation of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-real-time-scheduling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-real-time-scheduling-senior-architectural",
    "title": "Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Deterministic execution latency, priority inversion, priority inheritance mutexes.",
    "expected_signals": [
      "accurate explanation of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-real-time-scheduling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-real-time-scheduling-deep-scenario",
    "title": "Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Deterministic execution latency, priority inversion, priority inheritance mutexes.",
    "expected_signals": [
      "accurate explanation of Real-Time Scheduling: SCHED_FIFO vs SCHED_RR vs SCHED_DEADLINE",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-real-time-scheduling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-slab-allocator-fundamental",
    "title": "Kernel Memory Allocation: Slab, Slub and Slob Allocators (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Kernel Memory Allocation: Slab, Slub and Slob Allocators in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Buddy allocator, object caches, preventing kernel internal fragmentation.",
    "expected_signals": [
      "accurate explanation of Kernel Memory Allocation: Slab, Slub and Slob Allocators",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-slab-allocator",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-slab-allocator-senior-architectural",
    "title": "Kernel Memory Allocation: Slab, Slub and Slob Allocators (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Kernel Memory Allocation: Slab, Slub and Slob Allocators in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Buddy allocator, object caches, preventing kernel internal fragmentation.",
    "expected_signals": [
      "accurate explanation of Kernel Memory Allocation: Slab, Slub and Slob Allocators",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-slab-allocator",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-slab-allocator-deep-scenario",
    "title": "Kernel Memory Allocation: Slab, Slub and Slob Allocators (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Kernel Memory Allocation: Slab, Slub and Slob Allocators in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Buddy allocator, object caches, preventing kernel internal fragmentation.",
    "expected_signals": [
      "accurate explanation of Kernel Memory Allocation: Slab, Slub and Slob Allocators",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-slab-allocator",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-virtualization-vt-x-fundamental",
    "title": "Hardware Virtualization: Intel VT-x, EPT & VM Exits (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Hardware Virtualization: Intel VT-x, EPT & VM Exits in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hypervisor architecture, shadow page tables vs Extended Page Tables, VMCS.",
    "expected_signals": [
      "accurate explanation of Hardware Virtualization: Intel VT-x, EPT & VM Exits",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-virtualization-vt-x",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-virtualization-vt-x-senior-architectural",
    "title": "Hardware Virtualization: Intel VT-x, EPT & VM Exits (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Hardware Virtualization: Intel VT-x, EPT & VM Exits in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hypervisor architecture, shadow page tables vs Extended Page Tables, VMCS.",
    "expected_signals": [
      "accurate explanation of Hardware Virtualization: Intel VT-x, EPT & VM Exits",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-virtualization-vt-x",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-virtualization-vt-x-deep-scenario",
    "title": "Hardware Virtualization: Intel VT-x, EPT & VM Exits (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Hardware Virtualization: Intel VT-x, EPT & VM Exits in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hypervisor architecture, shadow page tables vs Extended Page Tables, VMCS.",
    "expected_signals": [
      "accurate explanation of Hardware Virtualization: Intel VT-x, EPT & VM Exits",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-virtualization-vt-x",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "os-ebpf-internals-fundamental",
    "title": "Linux eBPF Architecture & In-Kernel Observability (Fundamental)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux eBPF Architecture & In-Kernel Observability in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: eBPF bytecode verifier, JIT compilation, BPF maps, XDP network bypass.",
    "expected_signals": [
      "accurate explanation of Linux eBPF Architecture & In-Kernel Observability",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-ebpf-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "os-ebpf-internals-senior-architectural",
    "title": "Linux eBPF Architecture & In-Kernel Observability (Senior Architectural)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux eBPF Architecture & In-Kernel Observability in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: eBPF bytecode verifier, JIT compilation, BPF maps, XDP network bypass.",
    "expected_signals": [
      "accurate explanation of Linux eBPF Architecture & In-Kernel Observability",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-ebpf-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "os-ebpf-internals-deep-scenario",
    "title": "Linux eBPF Architecture & In-Kernel Observability (Deep Scenario)",
    "topic": "Operating Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux eBPF Architecture & In-Kernel Observability in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: eBPF bytecode verifier, JIT compilation, BPF maps, XDP network bypass.",
    "expected_signals": [
      "accurate explanation of Linux eBPF Architecture & In-Kernel Observability",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "os-ebpf-internals",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Operating Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-connection-pooling-fundamental",
    "title": "Database Connection Pooling Architecture & Sizing (Little's Law) (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Database Connection Pooling Architecture & Sizing (Little's Law) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Thread per connection model, socket starvation, sizing formula: connections = (core_count * 2) + effective_spindle_count.",
    "expected_signals": [
      "accurate explanation of Database Connection Pooling Architecture & Sizing (Little's Law)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-connection-pooling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-connection-pooling-senior-architectural",
    "title": "Database Connection Pooling Architecture & Sizing (Little's Law) (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Database Connection Pooling Architecture & Sizing (Little's Law) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Thread per connection model, socket starvation, sizing formula: connections = (core_count * 2) + effective_spindle_count.",
    "expected_signals": [
      "accurate explanation of Database Connection Pooling Architecture & Sizing (Little's Law)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-connection-pooling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-connection-pooling-deep-scenario",
    "title": "Database Connection Pooling Architecture & Sizing (Little's Law) (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Database Connection Pooling Architecture & Sizing (Little's Law) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Thread per connection model, socket starvation, sizing formula: connections = (core_count * 2) + effective_spindle_count.",
    "expected_signals": [
      "accurate explanation of Database Connection Pooling Architecture & Sizing (Little's Law)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-connection-pooling",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-query-optimizer-cost-fundamental",
    "title": "Cost-Based Query Optimization & Join Strategies (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Cost-Based Query Optimization & Join Strategies in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hash join vs Merge join vs Nested Loop join, statistics histograms, join order dynamic programming.",
    "expected_signals": [
      "accurate explanation of Cost-Based Query Optimization & Join Strategies",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-query-optimizer-cost",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-query-optimizer-cost-senior-architectural",
    "title": "Cost-Based Query Optimization & Join Strategies (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Cost-Based Query Optimization & Join Strategies in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hash join vs Merge join vs Nested Loop join, statistics histograms, join order dynamic programming.",
    "expected_signals": [
      "accurate explanation of Cost-Based Query Optimization & Join Strategies",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-query-optimizer-cost",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-query-optimizer-cost-deep-scenario",
    "title": "Cost-Based Query Optimization & Join Strategies (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Cost-Based Query Optimization & Join Strategies in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Hash join vs Merge join vs Nested Loop join, statistics histograms, join order dynamic programming.",
    "expected_signals": [
      "accurate explanation of Cost-Based Query Optimization & Join Strategies",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-query-optimizer-cost",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-sharding-rebalancing-fundamental",
    "title": "Horizontal Database Sharding, Resharding & Cross-Shard Joins (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Horizontal Database Sharding, Resharding & Cross-Shard Joins in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Range-based vs Hash-based sharding, distributed deadlock handling, two-phase commit overhead.",
    "expected_signals": [
      "accurate explanation of Horizontal Database Sharding, Resharding & Cross-Shard Joins",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-sharding-rebalancing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-sharding-rebalancing-senior-architectural",
    "title": "Horizontal Database Sharding, Resharding & Cross-Shard Joins (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Horizontal Database Sharding, Resharding & Cross-Shard Joins in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Range-based vs Hash-based sharding, distributed deadlock handling, two-phase commit overhead.",
    "expected_signals": [
      "accurate explanation of Horizontal Database Sharding, Resharding & Cross-Shard Joins",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-sharding-rebalancing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-sharding-rebalancing-deep-scenario",
    "title": "Horizontal Database Sharding, Resharding & Cross-Shard Joins (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Horizontal Database Sharding, Resharding & Cross-Shard Joins in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Range-based vs Hash-based sharding, distributed deadlock handling, two-phase commit overhead.",
    "expected_signals": [
      "accurate explanation of Horizontal Database Sharding, Resharding & Cross-Shard Joins",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-sharding-rebalancing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-vacuum-freeze-fundamental",
    "title": "PostgreSQL Transaction ID Wraparound & Emergency Autovacuum (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: 32-bit transaction ID limits, vacuum freeze, database shutdown protection.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-vacuum-freeze",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-vacuum-freeze-senior-architectural",
    "title": "PostgreSQL Transaction ID Wraparound & Emergency Autovacuum (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: 32-bit transaction ID limits, vacuum freeze, database shutdown protection.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-vacuum-freeze",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-vacuum-freeze-deep-scenario",
    "title": "PostgreSQL Transaction ID Wraparound & Emergency Autovacuum (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: 32-bit transaction ID limits, vacuum freeze, database shutdown protection.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Transaction ID Wraparound & Emergency Autovacuum",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-vacuum-freeze",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-index-skip-scan-fundamental",
    "title": "Index Skip Scan vs Full Index Scan Execution (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Index Skip Scan vs Full Index Scan Execution in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Using composite indexes when leading column has low cardinality without leading equality.",
    "expected_signals": [
      "accurate explanation of Index Skip Scan vs Full Index Scan Execution",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-index-skip-scan",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-index-skip-scan-senior-architectural",
    "title": "Index Skip Scan vs Full Index Scan Execution (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Index Skip Scan vs Full Index Scan Execution in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Using composite indexes when leading column has low cardinality without leading equality.",
    "expected_signals": [
      "accurate explanation of Index Skip Scan vs Full Index Scan Execution",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-index-skip-scan",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-index-skip-scan-deep-scenario",
    "title": "Index Skip Scan vs Full Index Scan Execution (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Index Skip Scan vs Full Index Scan Execution in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Using composite indexes when leading column has low cardinality without leading equality.",
    "expected_signals": [
      "accurate explanation of Index Skip Scan vs Full Index Scan Execution",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-index-skip-scan",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-replication-lag-fundamental",
    "title": "PostgreSQL Physical Streaming Replication & Replication Lag Mitigation (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: WAL sender, WAL receiver, synchronous vs asynchronous commit, read replica staleness.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-replication-lag",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-replication-lag-senior-architectural",
    "title": "PostgreSQL Physical Streaming Replication & Replication Lag Mitigation (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: WAL sender, WAL receiver, synchronous vs asynchronous commit, read replica staleness.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-replication-lag",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-replication-lag-deep-scenario",
    "title": "PostgreSQL Physical Streaming Replication & Replication Lag Mitigation (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: WAL sender, WAL receiver, synchronous vs asynchronous commit, read replica staleness.",
    "expected_signals": [
      "accurate explanation of PostgreSQL Physical Streaming Replication & Replication Lag Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-replication-lag",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "db-distributed-consensus-fundamental",
    "title": "Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB (Fundamental)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Leader election, log replication, split-brain quorum validation, term numbers.",
    "expected_signals": [
      "accurate explanation of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-distributed-consensus",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Fundamental"
    }
  },
  {
    "id": "db-distributed-consensus-senior-architectural",
    "title": "Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB (Senior Architectural)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Leader election, log replication, split-brain quorum validation, term numbers.",
    "expected_signals": [
      "accurate explanation of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-distributed-consensus",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "db-distributed-consensus-deep-scenario",
    "title": "Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB (Deep Scenario)",
    "topic": "Database Systems",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Leader election, log replication, split-brain quorum validation, term numbers.",
    "expected_signals": [
      "accurate explanation of Distributed Consensus: Raft vs Multi-Paxos in Spanner/CockroachDB",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "db-distributed-consensus",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Database Systems",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-dns-resolution-fundamental",
    "title": "DNS Resolution Hierarchy, Root Servers & Anycast Routing (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of DNS Resolution Hierarchy, Root Servers & Anycast Routing in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Recursive vs iterative lookups, TTL caching, DNS amplification attacks, DoH/DoT.",
    "expected_signals": [
      "accurate explanation of DNS Resolution Hierarchy, Root Servers & Anycast Routing",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-dns-resolution",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-dns-resolution-senior-architectural",
    "title": "DNS Resolution Hierarchy, Root Servers & Anycast Routing (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of DNS Resolution Hierarchy, Root Servers & Anycast Routing in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Recursive vs iterative lookups, TTL caching, DNS amplification attacks, DoH/DoT.",
    "expected_signals": [
      "accurate explanation of DNS Resolution Hierarchy, Root Servers & Anycast Routing",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-dns-resolution",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-dns-resolution-deep-scenario",
    "title": "DNS Resolution Hierarchy, Root Servers & Anycast Routing (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of DNS Resolution Hierarchy, Root Servers & Anycast Routing in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Recursive vs iterative lookups, TTL caching, DNS amplification attacks, DoH/DoT.",
    "expected_signals": [
      "accurate explanation of DNS Resolution Hierarchy, Root Servers & Anycast Routing",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-dns-resolution",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-bgp-routing-fundamental",
    "title": "Border Gateway Protocol (BGP), Autonomous Systems & Peering (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Border Gateway Protocol (BGP), Autonomous Systems & Peering in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Path vector protocol, AS-Path prepending, BGP route hijacking, RPKI.",
    "expected_signals": [
      "accurate explanation of Border Gateway Protocol (BGP), Autonomous Systems & Peering",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-bgp-routing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-bgp-routing-senior-architectural",
    "title": "Border Gateway Protocol (BGP), Autonomous Systems & Peering (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Border Gateway Protocol (BGP), Autonomous Systems & Peering in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Path vector protocol, AS-Path prepending, BGP route hijacking, RPKI.",
    "expected_signals": [
      "accurate explanation of Border Gateway Protocol (BGP), Autonomous Systems & Peering",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-bgp-routing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-bgp-routing-deep-scenario",
    "title": "Border Gateway Protocol (BGP), Autonomous Systems & Peering (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Border Gateway Protocol (BGP), Autonomous Systems & Peering in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Path vector protocol, AS-Path prepending, BGP route hijacking, RPKI.",
    "expected_signals": [
      "accurate explanation of Border Gateway Protocol (BGP), Autonomous Systems & Peering",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-bgp-routing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-nat-traversal-fundamental",
    "title": "NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Symmetric vs Full Cone NAT, hole punching, relay servers, candidate negotiation.",
    "expected_signals": [
      "accurate explanation of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-nat-traversal",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-nat-traversal-senior-architectural",
    "title": "NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Symmetric vs Full Cone NAT, hole punching, relay servers, candidate negotiation.",
    "expected_signals": [
      "accurate explanation of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-nat-traversal",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-nat-traversal-deep-scenario",
    "title": "NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Symmetric vs Full Cone NAT, hole punching, relay servers, candidate negotiation.",
    "expected_signals": [
      "accurate explanation of NAT Traversal: STUN, TURN, and ICE in WebRTC Peer-to-Peer",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-nat-traversal",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-load-balancing-l4-l7-fundamental",
    "title": "Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: TCP connection termination vs SYN proxying, DSR MAC rewrites, HTTP request routing.",
    "expected_signals": [
      "accurate explanation of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-load-balancing-l4-l7",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-load-balancing-l4-l7-senior-architectural",
    "title": "Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: TCP connection termination vs SYN proxying, DSR MAC rewrites, HTTP request routing.",
    "expected_signals": [
      "accurate explanation of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-load-balancing-l4-l7",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-load-balancing-l4-l7-deep-scenario",
    "title": "Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: TCP connection termination vs SYN proxying, DSR MAC rewrites, HTTP request routing.",
    "expected_signals": [
      "accurate explanation of Layer 4 vs Layer 7 Load Balancing & Direct Server Return (DSR)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-load-balancing-l4-l7",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-arp-and-switching-fundamental",
    "title": "ARP Protocol, Ethernet Frame Switching & CAM Table Overflow (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: MAC address learning, ARP poisoning, VLAN tagging 802.1Q, broadcast storms.",
    "expected_signals": [
      "accurate explanation of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-arp-and-switching",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-arp-and-switching-senior-architectural",
    "title": "ARP Protocol, Ethernet Frame Switching & CAM Table Overflow (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: MAC address learning, ARP poisoning, VLAN tagging 802.1Q, broadcast storms.",
    "expected_signals": [
      "accurate explanation of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-arp-and-switching",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-arp-and-switching-deep-scenario",
    "title": "ARP Protocol, Ethernet Frame Switching & CAM Table Overflow (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: MAC address learning, ARP poisoning, VLAN tagging 802.1Q, broadcast storms.",
    "expected_signals": [
      "accurate explanation of ARP Protocol, Ethernet Frame Switching & CAM Table Overflow",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-arp-and-switching",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-ip-fragmentation-fundamental",
    "title": "IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Don't Fragment (DF) flag, ICMP Fragmentation Needed, TCP MSS clamping.",
    "expected_signals": [
      "accurate explanation of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ip-fragmentation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-ip-fragmentation-senior-architectural",
    "title": "IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Don't Fragment (DF) flag, ICMP Fragmentation Needed, TCP MSS clamping.",
    "expected_signals": [
      "accurate explanation of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ip-fragmentation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-ip-fragmentation-deep-scenario",
    "title": "IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Don't Fragment (DF) flag, ICMP Fragmentation Needed, TCP MSS clamping.",
    "expected_signals": [
      "accurate explanation of IP Packet Fragmentation, MTU Discovery & Path MTU Black Holes",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ip-fragmentation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "net-ddos-mitigation-fundamental",
    "title": "DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec (Fundamental)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Volumetric vs protocol vs application DDoS attacks, scrub centers, rate limiting.",
    "expected_signals": [
      "accurate explanation of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ddos-mitigation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Fundamental"
    }
  },
  {
    "id": "net-ddos-mitigation-senior-architectural",
    "title": "DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec (Senior Architectural)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Volumetric vs protocol vs application DDoS attacks, scrub centers, rate limiting.",
    "expected_signals": [
      "accurate explanation of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ddos-mitigation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "net-ddos-mitigation-deep-scenario",
    "title": "DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec (Deep Scenario)",
    "topic": "Computer Networks",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Volumetric vs protocol vs application DDoS attacks, scrub centers, rate limiting.",
    "expected_signals": [
      "accurate explanation of DDoS Mitigation Architecture: SYN Cookies, Anycast & FlowSpec",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "net-ddos-mitigation",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Computer Networks",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-reader-writer-locks-fundamental",
    "title": "Reader-Writer Locks & Writer Starvation Mitigation (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Reader-Writer Locks & Writer Starvation Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Shared vs exclusive lock, read-preference vs write-preference, fair phase-fair RW locks.",
    "expected_signals": [
      "accurate explanation of Reader-Writer Locks & Writer Starvation Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-reader-writer-locks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-reader-writer-locks-senior-architectural",
    "title": "Reader-Writer Locks & Writer Starvation Mitigation (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Reader-Writer Locks & Writer Starvation Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Shared vs exclusive lock, read-preference vs write-preference, fair phase-fair RW locks.",
    "expected_signals": [
      "accurate explanation of Reader-Writer Locks & Writer Starvation Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-reader-writer-locks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-reader-writer-locks-deep-scenario",
    "title": "Reader-Writer Locks & Writer Starvation Mitigation (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Reader-Writer Locks & Writer Starvation Mitigation in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Shared vs exclusive lock, read-preference vs write-preference, fair phase-fair RW locks.",
    "expected_signals": [
      "accurate explanation of Reader-Writer Locks & Writer Starvation Mitigation",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-reader-writer-locks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-lock-free-queue-fundamental",
    "title": "Michael-Scott Lock-Free Queue Algorithm (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Michael-Scott Lock-Free Queue Algorithm in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Atomic CAS on head and tail pointers, handling concurrent enqueue/dequeue, dummy node.",
    "expected_signals": [
      "accurate explanation of Michael-Scott Lock-Free Queue Algorithm",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-lock-free-queue",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-lock-free-queue-senior-architectural",
    "title": "Michael-Scott Lock-Free Queue Algorithm (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Michael-Scott Lock-Free Queue Algorithm in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Atomic CAS on head and tail pointers, handling concurrent enqueue/dequeue, dummy node.",
    "expected_signals": [
      "accurate explanation of Michael-Scott Lock-Free Queue Algorithm",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-lock-free-queue",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-lock-free-queue-deep-scenario",
    "title": "Michael-Scott Lock-Free Queue Algorithm (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Michael-Scott Lock-Free Queue Algorithm in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Atomic CAS on head and tail pointers, handling concurrent enqueue/dequeue, dummy node.",
    "expected_signals": [
      "accurate explanation of Michael-Scott Lock-Free Queue Algorithm",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-lock-free-queue",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-thread-pool-sizing-fundamental",
    "title": "Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Amdahl's law, blocking factor formula: threads = cores * (1 + wait_time / service_time).",
    "expected_signals": [
      "accurate explanation of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-thread-pool-sizing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-thread-pool-sizing-senior-architectural",
    "title": "Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Amdahl's law, blocking factor formula: threads = cores * (1 + wait_time / service_time).",
    "expected_signals": [
      "accurate explanation of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-thread-pool-sizing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-thread-pool-sizing-deep-scenario",
    "title": "Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Amdahl's law, blocking factor formula: threads = cores * (1 + wait_time / service_time).",
    "expected_signals": [
      "accurate explanation of Thread Pool Sizing for CPU-Bound vs I/O-Bound Workloads",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-thread-pool-sizing",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-deadlock-recovery-fundamental",
    "title": "Automated Deadlock Recovery in Distributed Systems (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Automated Deadlock Recovery in Distributed Systems in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Wait-for graphs, victim selection criteria, transaction rollback and retry with jitter.",
    "expected_signals": [
      "accurate explanation of Automated Deadlock Recovery in Distributed Systems",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-deadlock-recovery",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-deadlock-recovery-senior-architectural",
    "title": "Automated Deadlock Recovery in Distributed Systems (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Automated Deadlock Recovery in Distributed Systems in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Wait-for graphs, victim selection criteria, transaction rollback and retry with jitter.",
    "expected_signals": [
      "accurate explanation of Automated Deadlock Recovery in Distributed Systems",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-deadlock-recovery",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-deadlock-recovery-deep-scenario",
    "title": "Automated Deadlock Recovery in Distributed Systems (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Automated Deadlock Recovery in Distributed Systems in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Wait-for graphs, victim selection criteria, transaction rollback and retry with jitter.",
    "expected_signals": [
      "accurate explanation of Automated Deadlock Recovery in Distributed Systems",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-deadlock-recovery",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-coroutine-runtimes-fundamental",
    "title": "Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: M:N green threading, runtime scheduler (work stealing), stack splitting vs contiguous stacks.",
    "expected_signals": [
      "accurate explanation of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-coroutine-runtimes",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-coroutine-runtimes-senior-architectural",
    "title": "Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: M:N green threading, runtime scheduler (work stealing), stack splitting vs contiguous stacks.",
    "expected_signals": [
      "accurate explanation of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-coroutine-runtimes",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-coroutine-runtimes-deep-scenario",
    "title": "Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async) in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: M:N green threading, runtime scheduler (work stealing), stack splitting vs contiguous stacks.",
    "expected_signals": [
      "accurate explanation of Stackful vs Stackless Coroutines (Go Goroutines vs Rust/JS async)",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-coroutine-runtimes",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-software-transactional-memory-fundamental",
    "title": "Software Transactional Memory (STM) & Optimistic Concurrency (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Software Transactional Memory (STM) & Optimistic Concurrency in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Memory transaction logging, validation, conflict aborts vs lock-free execution.",
    "expected_signals": [
      "accurate explanation of Software Transactional Memory (STM) & Optimistic Concurrency",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-software-transactional-memory",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-software-transactional-memory-senior-architectural",
    "title": "Software Transactional Memory (STM) & Optimistic Concurrency (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Software Transactional Memory (STM) & Optimistic Concurrency in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Memory transaction logging, validation, conflict aborts vs lock-free execution.",
    "expected_signals": [
      "accurate explanation of Software Transactional Memory (STM) & Optimistic Concurrency",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-software-transactional-memory",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-software-transactional-memory-deep-scenario",
    "title": "Software Transactional Memory (STM) & Optimistic Concurrency (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Software Transactional Memory (STM) & Optimistic Concurrency in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Memory transaction logging, validation, conflict aborts vs lock-free execution.",
    "expected_signals": [
      "accurate explanation of Software Transactional Memory (STM) & Optimistic Concurrency",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-software-transactional-memory",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  },
  {
    "id": "conc-seqlocks-fundamental",
    "title": "Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data (Fundamental)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Medium",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Sequence counter, writer locking, lock-free speculative reading, retry loops.",
    "expected_signals": [
      "accurate explanation of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-seqlocks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Fundamental"
    }
  },
  {
    "id": "conc-seqlocks-senior-architectural",
    "title": "Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data (Senior Architectural)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Sequence counter, writer locking, lock-free speculative reading, retry loops.",
    "expected_signals": [
      "accurate explanation of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-seqlocks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Senior Architectural"
    }
  },
  {
    "id": "conc-seqlocks-deep-scenario",
    "title": "Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data (Deep Scenario)",
    "topic": "Concurrency & Hardware",
    "subtopic": "Systems Principles",
    "difficulty": "Senior",
    "prompt": "Explain the underlying computer science principles and failure modes of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data in a high-concurrency production environment.",
    "context_scenario": "Practical production deployment context: Sequence counter, writer locking, lock-free speculative reading, retry loops.",
    "expected_signals": [
      "accurate explanation of Linux Kernel Sequential Locks (SeqLocks) for Read-Heavy Data",
      "understanding of hardware and kernel constraints",
      "practical failure mitigation strategies"
    ],
    "follow_up_probes": [
      "How does this behave under extreme concurrency or resource exhaustion?",
      "What telemetry or metrics would you inspect to debug this in production?"
    ],
    "question_family": "conc-seqlocks",
    "source_attribution": "Strop Curated Core CS Bank",
    "metadata_json": {
      "pillar": "Concurrency & Hardware",
      "level": "Deep Scenario"
    }
  }
]
