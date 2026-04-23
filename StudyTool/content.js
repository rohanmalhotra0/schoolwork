/* =====================================================================
   CS202 — content
   every item below traces back to a specific quiz / exam / lab / hw
   ===================================================================== */

/* ============== LEARN — modules ============== */
const MODULES = [
  {
    id: "proc",
    num: "01",
    title: "Processes, fork & exec",
    est: "~25 min",
    steps: [
      { h:"What a process *is*",
        p:[
          "A process = one running program + its register state + address space + file descriptors + kernel bookkeeping (PCB).",
          "Each UNIX process has a pid (int), a parent, a heap growing up, a stack growing down, and an fd table of small ints."
        ]
      },
      { h:"fork() — the API",
        p:[
          "fork() creates an almost-identical copy of the caller.",
          "Return 0 in the CHILD. Return child's pid in the PARENT. Return −1 on failure.",
          "Execution continues at the instruction AFTER the fork in both — not at main(), not from the top.",
          "All memory is copy-on-write. File descriptors are duplicated (both processes share the same open-file entry — offset is shared)."
        ]
      },
      { h:"exec*() — replace yourself",
        p:[
          "execvp/execve overwrites the calling process's address space with a new program but keeps pid and fd table.",
          "If exec succeeds, it does NOT return. If it returns, something went wrong (-1)."
        ],
        code:"pid_t pid = fork();\nif (pid == 0) {\n    execvp(\"ls\", argv);   // child becomes ls\n    _exit(1);             // only if exec fails\n}\nwaitpid(pid, &status, 0); // parent waits"
      },
      { h:"pipes & dup2 — plumbing",
        p:[
          "pipe(int fd[2]) returns two fds: fd[0]=read end, fd[1]=write end.",
          "dup2(old, new) makes `new` refer to the same open file entry as `old`, closing whatever `new` was.",
          "Classic redirection `cmd > file`: open file, dup2 it onto fd 1, close original, exec."
        ],
        code:"int p[2]; pipe(p);\nif (fork() == 0) {          // child = ls\n    dup2(p[1], 1); close(p[0]); close(p[1]);\n    execvp(\"ls\", argv);\n}\nif (fork() == 0) {          // child = grep\n    dup2(p[0], 0); close(p[0]); close(p[1]);\n    execvp(\"grep\", argv2);\n}\nclose(p[0]); close(p[1]);\nwait(NULL); wait(NULL);"
      }
    ],
    check: {
      q: "After a successful fork(), both parent and child resume at…",
      opts: [
        "main()",
        "the top of the program",
        "the instruction immediately after the fork call",
        "an exception handler"
      ],
      a: 2,
      why: "fork duplicates the running state. Both return from the same call site with different return values."
    }
  },

  { id:"asm",
    num:"02",
    title:"x86-64 assembly & stack frames",
    est:"~25 min",
    steps:[
      { h:"Registers you must know",
        p:[
          "%rip — instruction pointer. %rsp — stack pointer (low = top). %rbp — frame pointer (optional, conventional).",
          "Arg regs (System V): %rdi, %rsi, %rdx, %rcx, %r8, %r9. Return: %rax.",
          "%cr3 — physical address of the current page table (root). Caller-saved: %rax, %rcx, %rdx, %rdi, %rsi, %r8–%r11. Callee-saved: %rbx, %rbp, %r12–%r15."
        ]},
      { h:"Function prologue / epilogue",
        p:[
          "Prologue:\n    pushq %rbp\n    movq  %rsp, %rbp\n    subq  $N, %rsp        # allocate local space",
          "Epilogue:\n    movq  %rbp, %rsp\n    popq  %rbp\n    retq                  # pops return addr into %rip"
        ],
        code:"; the entire stack frame exists between %rbp and %rsp\n; locals are addressed as -8(%rbp), -16(%rbp), ...\n; args beyond 6 arrive at 16(%rbp), 24(%rbp), ..."
      },
      { h:"call / ret",
        p:[
          "callq target: pushes return addr (8 bytes) onto the stack, jumps to target.",
          "retq: pops 8 bytes into %rip.",
          "So %rsp moves DOWN by 8 at call, UP by 8 at ret."
        ]},
      { h:"Trace discipline (appears every exam)",
        p:[
          "Write: address of next instruction, PC after each instr, values at %rsp and %rbp.",
          "For push/pop remember: push decrements %rsp first, then stores; pop loads, then increments %rsp.",
          "movq (%rsi), %rsp  — loads the QWORD at address %rsi into %rsp. This is how swtch() switches stacks."
        ]}
    ],
    check: {
      q: "When you execute `popq %rbp`, what happens to %rsp?",
      opts: ["decreases by 8","increases by 8","unchanged","set to %rbp"],
      a: 1,
      why: "pop reads 8 bytes at %rsp then adds 8 to %rsp."
    }
  },

  { id:"threads",
    num:"03",
    title:"Threads, mutexes & condition variables",
    est:"~35 min",
    steps:[
      { h:"Why threads need synchronization",
        p:[
          "Two threads that share data will eventually race. A race = a bug whose presence depends on scheduling.",
          "Even a single `x++` is three steps: load, add, store. Interleaving two of them can lose an update."
        ]},
      { h:"Mutex — binary ownership",
        p:[
          "mutex_lock() either returns holding the lock, or blocks until the holder releases.",
          "Unlocked state is the only state in which the invariants protected by the lock must hold."
        ]},
      { h:"Condition variables — Mesa semantics",
        p:[
          "cond_wait(cv, mtx): atomically releases mtx AND blocks. When signalled, re-acquires mtx before returning.",
          "Always wait in a `while (!cond) cond_wait(...)` — spurious wakeups + between-signal-and-wakeup races.",
          "Use broadcast if any waiter could proceed; signal only if exactly one waiter can."
        ],
        code:"// producer\nmutex_lock(&m);\nwhile (buf.full()) cond_wait(&not_full, &m);\nbuf.push(x);\ncond_signal(&not_empty);\nmutex_unlock(&m);"
      },
      { h:"Dahlin's four concurrency commandments",
        p:[
          "(1) Associate every shared-data invariant with a lock. State what it is.",
          "(2) To wait: `while (!cond) cond_wait`. Never `if`.",
          "(3) Enforce a total order on lock acquisition — always acquire in the same order everywhere.",
          "(4) No data races: every shared read AND write is under the lock that protects it."
        ]}
    ],
    check: {
      q: "Why do we wait in a `while` instead of an `if`?",
      opts: [
        "Spurious wakeups aside — between wakeup and re-acquiring the lock, another thread may have stolen the condition.",
        "It's faster.",
        "C doesn't have `if` inside a thread.",
        "To avoid deadlock on the condition variable."
      ],
      a: 0,
      why: "Mesa semantics: signalling does NOT hand ownership; another waiter can run first and re-consume the resource."
    }
  },

  { id:"vm",
    num:"04",
    title:"Virtual memory & x86-64 paging",
    est:"~35 min",
    steps:[
      { h:"The picture",
        p:[
          "MMU translates virtual → physical using the page table rooted at %cr3.",
          "x86-64: 48-bit VA, 4 levels of page tables, each level indexed by 9 bits, page size 4KB (12-bit offset).",
          "Each page table = one 4KB page = 512 × 8-byte PTEs."
        ]},
      { h:"PTE bits",
        p:[
          "PTE_P (present) — valid mapping. PTE_W — writable. PTE_U — user-accessible (without it, access from ring 3 → page fault).",
          "Load/store with PTE_P=0 → page fault. Store with PTE_W=0 → page fault. User access with PTE_U=0 → page fault."
        ]},
      { h:"TLB",
        p:[
          "Cache of recent VA→PA translations. A TLB miss is not a fault — the hardware walks the page tables.",
          "Page fault always ALSO misses the TLB (because there was nothing to cache). The reverse is not true."
        ]},
      { h:"Page table sizing — the standard question",
        p:[
          "Process using 12 KB (3 pages of data): needs 3 data pages + L1 + L2 + L3 + L4 = 7 physical pages min.",
          "For 2^9 + 1 = 513 allocations of 4KB: data = 513 pages; L1 pages = ceil(513/512)=2; L2=1; L3=1; L4=1 → 513+5 = 518."
        ],
        code:"// translation\nL1_idx = (va >> 39) & 0x1FF\nL2_idx = (va >> 30) & 0x1FF\nL3_idx = (va >> 21) & 0x1FF\nL4_idx = (va >> 12) & 0x1FF\noffset = va & 0xFFF"
      }
    ],
    check: {
      q: "A TLB miss on an x86-64 user access…",
      opts: [
        "always causes a page fault",
        "sometimes causes a page fault — only if the PTE is missing or permission-denied",
        "never causes a page fault",
        "causes a privilege violation"
      ],
      a: 1,
      why: "Most TLB misses are silently handled by the page-table walker. Only if the walk fails or denies access does a fault fire."
    }
  },

  { id:"weensyos",
    num:"05",
    title:"WeensyOS (Lab 4)",
    est:"~25 min",
    steps:[
      { h:"Memory map constants",
        p:[
          "KERNEL_START_ADDR, KERNEL_STACK_TOP, console = 0xB8000 (CGA).",
          "PROC_START_ADDR = start of user processes.",
          "MEMSIZE_PHYSICAL = 0x200000 (2 MB). MEMSIZE_VIRTUAL = 0x300000 (3 MB)."
        ]},
      { h:"pageinfo[]",
        p:[
          "Array indexed by physical page number (PPN). Each slot: owner, refcount.",
          "owner values: PO_FREE(0), PO_KERNEL, PO_RESERVED, or pid>0.",
          "A page is free iff pageinfo[pn].refcount == 0. Owner of a process page should be that process's pid."
        ]},
      { h:"Step 1 — kernel isolation",
        p:[
          "Map kernel memory with PTE_P|PTE_W (no PTE_U). Map the console (0xB8000) with PTE_P|PTE_W|PTE_U so processes can write.",
          "Use virtual_memory_map(kernel_pagetable, va, pa, size, perm, NULL)."
        ]},
      { h:"Step 2 — isolated address spaces",
        p:[
          "copy_pagetable(src, owner) allocates a new 4-level tree and copies src's mappings.",
          "User-area (≥ PROC_START_ADDR) initially NOT mapped (not PTE_U).",
          "Don't forget to set pageinfo[].owner for the page-table pages themselves."
        ]},
      { h:"Step 5 — fork()",
        p:[
          "Find free slot in processes[] (not slot 0). Return -1 if none.",
          "copy_pagetable(parent). Walk every user VA: if parent has a writable PTE_U page, allocate new physical page P, memcpy from parent, map P in child.",
          "Copy registers, set child's reg_rax = 0; return child's pid to parent."
        ],
        code:"// the gotcha\n// if you forget to copy a page and just reuse the parent's\n// mapping, the GUI shows the same number in both processes'\n// rows — that is the visual signal for 'stack/data is shared'."
      }
    ],
    check: {
      q: "pageinfo[202] reads `.owner = 4, .refcount = 1`. What does that mean?",
      opts: [
        "Process 4 has 202 pages.",
        "Page 202 is owned by process 4 and is mapped once.",
        "The physical page at address 202 is free.",
        "The 202nd process is running on CPU 4."
      ],
      a: 1,
      why: "pageinfo is indexed by physical page number. Entry 202 refers to physical page 202."
    }
  },

  { id:"sched",
    num:"06",
    title:"Scheduling & disks",
    est:"~20 min",
    steps:[
      { h:"CPU scheduling policies",
        p:[
          "FCFS — first-come-first-served. Simple. Convoy effect.",
          "Round-robin — fixed quantum. Fair on latency, not on throughput if quantum is too small.",
          "MLFQ — multiple queues, demote on quantum exhaustion, promote via periodic boost. Approximates SRTF without knowing runtimes."
        ]},
      { h:"Disk scheduling (HDDs)",
        p:[
          "FCFS — order of arrival.",
          "SSTF — shortest seek next. Can starve far-away requests.",
          "SCAN / elevator — sweep in one direction, then the other. LOOK = same but reverses without going to the end."
        ]},
      { h:"HDD numbers worth internalizing",
        p:[
          "RPM → rotational latency. Avg latency = 60/RPM/2 in seconds.",
          "Random read cost ≈ seek + avg rot latency + tiny xfer. Almost purely mechanical.",
          "Sequential bandwidth = sectors_per_track × sector_size × RPM / 60."
        ]},
      { h:"SSDs",
        p:[
          "Read/write to flash cells; no seek, no rotational latency.",
          "Writes are per-page but erase is per-block — wear leveling is required.",
          "Sequential vs random: much smaller gap than HDDs (but still present)."
        ]}
    ],
    check: {
      q: "At 12,000 RPM the average rotational latency is approximately…",
      opts: [ "5.0 ms", "2.5 ms", "1.25 ms", "10.0 ms" ],
      a: 1,
      why: "60000 ms / 12000 rpm = 5 ms per revolution. Average latency = half a rev = 2.5 ms."
    }
  },

  { id:"fs",
    num:"07",
    title:"File systems (Lab 5 / UNIX FFS)",
    est:"~30 min",
    steps:[
      { h:"Layers of the FS",
        p:[
          "Process → VFS → specific file system driver → block layer → disk.",
          "FUSE plugs a user-space process into VFS as if it were a kernel driver."
        ]},
      { h:"Our disk layout (Lab 5)",
        p:[
          "Block 0: superblock. Block 1+: free-block bitmap. Then mixed inode/data blocks.",
          "Block size = 4096 B. Each inode is its own block (simplification).",
          "i_direct[N_DIRECT=10], i_indirect, i_double. Max file (theoretical) ≈ 4 GB."
        ]},
      { h:"inode_block_walk vs inode_get_block",
        p:[
          "inode_block_walk(ino, filebno, &ppdiskbno, alloc): point ppdiskbno at the uint32_t slot inside the inode / indirect block that HOLDS the disk block number for logical file block `filebno`. Allocate an indirect block if needed.",
          "inode_get_block(ino, filebno, &blk): uses walk, then allocates the data block if 0, and sets blk to an in-memory pointer to that block."
        ]},
      { h:"Mapping filebno to the right region",
        p:[
          "filebno < 10 → direct: &ino->i_direct[filebno]",
          "10 ≤ filebno < 10+1024 → indirect: &indirect_block[filebno - 10]",
          "10+1024 ≤ filebno < 10+1024+1024*1024 → double-indirect:\n  rel = filebno - 10 - 1024\n  outer = rel / 1024; inner = rel % 1024"
        ],
        code:"// worked: filebno = 8225\n// 8225 - 10 = 8215; 8215 - 1024 = 7191  → double-indirect\n// outer = 7191 / 1024 = 7\n// inner = 7191 %  1024 = 23"
      }
    ],
    check: {
      q: "In our FS, where is the slot that holds the disk block number for logical file block 7?",
      opts: [
        "in the indirect block",
        "in the double-indirect block",
        "directly in the inode, i_direct[7]",
        "in the superblock"
      ],
      a: 2,
      why: "filebno 0..9 live in i_direct[] inside the inode itself."
    }
  },

  { id:"crash",
    num:"08",
    title:"Crash recovery & logging",
    est:"~20 min",
    steps:[
      { h:"The problem",
        p:[
          "A single multi-block operation (create + allocate + write) can crash half-done. On reboot the FS must restore a consistent state."
        ]},
      { h:"Redo logging (write-ahead)",
        p:[
          "For each op: write journal entries to the log. Write TxnBegin/TxnEnd. Only AFTER TxnEnd hits disk may you checkpoint to the real data structures.",
          "Recovery: find committed transactions (those with TxnEnd) and redo their entries."
        ]},
      { h:"Undo logging",
        p:[
          "Write the OLD value to the log before modifying in-place. On recovery, undo transactions that lack TxnEnd.",
          "Can't eliminate the undo pass if you only redo — because you could see a partial checkpoint on disk with no log record (writes happened before journal flush)."
        ]},
      { h:"Copy-on-write (ZFS)",
        p:[
          "Never overwrite live data. Write new versions to free blocks; atomically flip a single root pointer at the end.",
          "Either the old state or the new state is on disk — never a mix."
        ]},
      { h:"Write-behind journaling — doesn't work",
        p:[
          "If you write journal entries AFTER checkpointing, a crash between checkpoint and journal write leaves a modified FS with no record of the intent. Undo doesn't know what to undo → corrupt."
        ]}
    ],
    check: {
      q: "Why does redo-only logging require the journal to be written before data (write-ahead)?",
      opts: [
        "Performance.",
        "Because otherwise, a crash can leave the data modified on disk with no log record, so redo has nothing to act on.",
        "Because the journal is smaller than the data.",
        "Because disks are slow."
      ],
      a: 1,
      why: "Write-ahead invariant: no on-disk change is allowed to precede its log record."
    }
  },

  { id:"dist",
    num:"09",
    title:"Distributed systems & security",
    est:"~20 min",
    steps:[
      { h:"NFS idempotency",
        p:[
          "NFS retransmits on timeout. Server must be idempotent: repeated writes/reads must produce the same observable result.",
          "This is why NFS exposes inode numbers rather than paths — rename shouldn't change the identity the client retransmits against."
        ]},
      { h:"Two-phase commit (2PC)",
        p:[
          "Coordinator sends PREPARE; each participant votes YES or NO. If all YES → COMMIT, else ABORT.",
          "Blocks on coordinator failure (participants can be stuck with their resources locked)."
        ]},
      { h:"Two Generals",
        p:[
          "You cannot reach guaranteed common knowledge over a lossy channel with finite messages.",
          "Real systems handle this with timeouts + retry + idempotent operations."
        ]},
      { h:"Buffer overflows / W^X / setuid",
        p:[
          "Classic stack overflow: unbounded strcpy/gets → overwrite return address → jump to attacker code.",
          "W^X: a page may be writable OR executable, never both. Mitigates code injection.",
          "setuid: effective uid = program owner while running. Attacking a setuid-root program escalates to root."
        ]},
      { h:"Ken Thompson — trusting trust",
        p:[
          "A compiler binary can be backdoored so that when it compiles login, it inserts the backdoor; and when it compiles ITSELF, it re-inserts the self-replicating logic. Source code is clean. Only way out is a compiler built from scratch."
        ]}
    ],
    check: {
      q: "A key reason NFS operations must be idempotent:",
      opts: [
        "Clients can retransmit after a timeout, and must not corrupt state if the original actually succeeded.",
        "To save disk space.",
        "NFS is stateful.",
        "So that directories are faster."
      ],
      a: 0,
      why: "Classic answer. NFS's at-least-once RPCs only work because applying them twice is safe."
    }
  }
];

/* ============== FLASHCARDS ============== */
const CARDS = [
  // PROCESSES + ASM
  { deck:"asm", front:"fork() return values", back:"0 in the child · child's pid in the parent · −1 on failure. Both continue at the instruction after fork." },
  { deck:"asm", front:"execvp() — does it return?", back:"Not on success (the address space is replaced). If it returns, it returned −1 and errno is set." },
  { deck:"asm", front:"dup2(old, new)", back:"Makes file descriptor `new` refer to the same open-file entry as `old`; closes whatever `new` previously was." },
  { deck:"asm", front:"pipe(int fd[2])", back:"Fills fd[0] (read end) and fd[1] (write end) with a unidirectional kernel-buffered pipe." },
  { deck:"asm", front:"Function prologue on x86-64", back:"pushq %rbp ; movq %rsp,%rbp ; subq $N,%rsp" },
  { deck:"asm", front:"Function epilogue on x86-64", back:"movq %rbp,%rsp ; popq %rbp ; retq" },
  { deck:"asm", front:"Arg registers (System V)", back:"%rdi, %rsi, %rdx, %rcx, %r8, %r9. Return in %rax." },
  { deck:"asm", front:"Caller-saved vs callee-saved", back:"Caller-saved: rax, rcx, rdx, rsi, rdi, r8-r11. Callee-saved: rbx, rbp, r12-r15." },
  { deck:"asm", front:"What does `callq` do to %rsp?", back:"Decrements %rsp by 8, then writes the return address (8 bytes) at %rsp." },
  { deck:"asm", front:"What does `retq` do?", back:"Pops 8 bytes from the stack into %rip, increasing %rsp by 8." },
  { deck:"asm", front:"Child of fork shares what with parent?", back:"Copy-on-write memory; DUPLICATED file descriptor table; same open-file entries (shared offsets)." },
  { deck:"asm", front:"Output redirection: `cmd > f`", back:"fd = open(f, O_CREAT|O_TRUNC|O_WRONLY) ; dup2(fd, 1) ; close(fd) ; exec(cmd)" },

  // CONCURRENCY
  { deck:"concurrency", front:"Race condition", back:"A bug whose presence depends on scheduling — two threads access shared state, at least one is a write, and they aren't properly ordered." },
  { deck:"concurrency", front:"Critical section", back:"A region of code that operates on shared state and must run with mutual exclusion." },
  { deck:"concurrency", front:"mutex_lock()", back:"Blocks the caller until no one holds the lock, then returns with the lock held." },
  { deck:"concurrency", front:"cond_wait(cv, mtx) — semantics", back:"Atomically releases mtx AND blocks the caller. On wakeup it re-acquires mtx before returning (Mesa semantics)." },
  { deck:"concurrency", front:"`while` vs `if` around cond_wait", back:"Always `while (!cond) cond_wait`. Mesa wakeups don't hand ownership — another waiter may have stolen the condition." },
  { deck:"concurrency", front:"signal vs broadcast", back:"signal wakes one waiter; broadcast wakes all. Broadcast when you can't name a unique waiter that can proceed." },
  { deck:"concurrency", front:"Dahlin's 4 concurrency commandments", back:"(1) lock protects an invariant · (2) wait in while · (3) total lock order · (4) no races: every shared R/W under the right lock." },
  { deck:"concurrency", front:"Deadlock conditions (Coffman)", back:"Mutual exclusion · hold-and-wait · no preemption · circular wait. Break any one to prevent deadlock." },
  { deck:"concurrency", front:"Total lock order", back:"All threads acquire a fixed set of locks in the same global order, preventing circular wait." },
  { deck:"concurrency", front:"Spinlock", back:"Busy-waits until the lock is free. Good only for very short critical sections and for kernel code that can't block." },
  { deck:"concurrency", front:"Atomic CMPXCHG", back:"cmpxchg(addr, old, new): if *addr==old, set *addr=new. Returns old contents. Single-instruction atomicity." },
  { deck:"concurrency", front:"Sequential consistency (SC)", back:"The result of any execution is equivalent to some global interleaving of per-thread ops where each thread's ops appear in program order." },

  // VM
  { deck:"vm", front:"x86-64 page size", back:"4 KB (2^12 bytes). Low 12 bits of a VA are the page offset." },
  { deck:"vm", front:"x86-64 page-table depth", back:"4 levels. Each level indexed by 9 bits of the VA. 512 × 8 B entries = one 4 KB page." },
  { deck:"vm", front:"PTE_P, PTE_W, PTE_U", back:"Present (mapping exists) · Writable · User-accessible. Access in violation of any → page fault." },
  { deck:"vm", front:"%cr3", back:"Holds the physical address of the current process's top-level page-table page." },
  { deck:"vm", front:"TLB", back:"Hardware cache of recent VA→PA translations. A TLB miss triggers a page-walk, NOT a page fault." },
  { deck:"vm", front:"Page fault vs TLB miss", back:"Page fault ⇒ TLB miss (always). TLB miss ⇒ page fault (only sometimes — if the walk fails)." },
  { deck:"vm", front:"Min pages for a 12 KB process on x86-64", back:"3 data + L1 + L2 + L3 + L4 = 7 physical pages." },
  { deck:"vm", front:"PTEs per level", back:"4 KB / 8 B = 512 = 2^9 entries. That's why each level is 9 bits." },
  { deck:"vm", front:"Demand paging", back:"Don't allocate a physical page until the process actually touches the VA. A page fault brings it in." },
  { deck:"vm", front:"mmap", back:"Maps a file (or anonymous memory) into the process's VA space. Accesses become page faults the kernel resolves by loading file data." },
  { deck:"vm", front:"malloc overrun detection trick", back:"Place guard pages with no PTE_P around allocations — touching them page-faults, which the kernel turns into a crash." },

  // DISK / SCHED
  { deck:"disk", front:"HDD components of access time", back:"Seek time + rotational latency + transfer time. Random I/O ≈ seek + rot; sequential is almost pure transfer." },
  { deck:"disk", front:"Average rotational latency", back:"Half a revolution = 60 / (2·RPM) seconds." },
  { deck:"disk", front:"SSTF", back:"Shortest Seek-Time First. Picks the queued request closest to the current head. Can starve far-away requests." },
  { deck:"disk", front:"SCAN / elevator", back:"Sweep the head in one direction servicing anything in its path, then reverse." },
  { deck:"disk", front:"LOOK vs SCAN", back:"LOOK reverses as soon as there are no more requests in the current direction. SCAN goes all the way to the edge." },
  { deck:"disk", front:"FCFS scheduling", back:"Services requests in arrival order. Simple but random-access-hostile." },
  { deck:"disk", front:"MLFQ", back:"Multi-level feedback queue. Jobs start high-priority and drop on quantum exhaustion. Periodic boost prevents starvation." },
  { deck:"disk", front:"Interrupts vs polling", back:"Interrupts: low overhead at low rates, high overhead at high rates. Polling: fixed overhead per poll, useful when rate is very high." },

  // FILE SYSTEMS
  { deck:"fs", front:"Superblock", back:"Block 0 (in our FS). Holds block size, FS size, pointer to root inode, etc." },
  { deck:"fs", front:"Bitmap block", back:"Block 1 onward. One bit per disk block; 1 = free, 0 = allocated." },
  { deck:"fs", front:"Our FS block size", back:"BLKSIZE = 4096 bytes. 4096/4 = 1024 block-pointer slots per indirect block." },
  { deck:"fs", front:"Inode direct slots", back:"N_DIRECT = 10. First 10 logical file blocks are addressed directly from the inode." },
  { deck:"fs", front:"Max file size with 10 direct + 1 indirect + 1 double", back:"(10 + 1024 + 1024·1024) · 4096 ≈ 4 GB." },
  { deck:"fs", front:"Hard link", back:"Two directory entries pointing at the same inode. Inode's link count goes up; file disappears when it hits zero." },
  { deck:"fs", front:"Symbolic link", back:"A small file whose contents are a path string. Not tied to an inode number — can cross file systems and dangle." },
  { deck:"fs", front:"FUSE", back:"Filesystem in Userspace. Kernel module that forwards VFS calls to a user-space driver that implements callbacks." },
  { deck:"fs", front:"inode_block_walk vs inode_get_block", back:"walk: point at the uint32_t slot holding the disk-block number. get_block: walk, then ensure the data block exists and return a pointer to it." },
  { deck:"fs", front:"filebno 8225 lives where?", back:"Double-indirect region. rel = 8225−10−1024 = 7191; outer = 7191/1024 = 7; inner = 7191%1024 = 23." },
  { deck:"fs", front:"Sparse files", back:"Logical holes are stored as block 0 (no allocation). Reads return zeros. count_blocks_used should skip slots equal to 0." },

  // CRASH RECOVERY
  { deck:"crash", front:"Write-ahead logging invariant", back:"No on-disk change may be flushed before its log record for that change is durable." },
  { deck:"crash", front:"Redo log recovery", back:"Find all committed transactions (those with TxnEnd). Replay their journal entries onto the data." },
  { deck:"crash", front:"Undo log recovery", back:"For every transaction lacking TxnEnd, use the saved old values to roll back its effects." },
  { deck:"crash", front:"Why not redo-only?", back:"Because without undo, checkpointing could have happened before the journal write durability, leaving data modified with no record to redo." },
  { deck:"crash", front:"Copy-on-write (ZFS)", back:"Never overwrite live blocks. Write new versions, then atomically flip one root pointer. Power loss is always consistent." },
  { deck:"crash", front:"EXT4 journaling mode", back:"Metadata journaling. Metadata changes go through the journal; data may be written before or after (ordered, writeback, or journal mode)." },
  { deck:"crash", front:"Write-behind journaling", back:"Broken. Data is already modified before the journal notes it, so a crash leaves you without a log of what to undo." },

  // DISTRIBUTED
  { deck:"dist", front:"NFS idempotency — why?", back:"NFS clients retransmit lost RPCs. If operations weren't idempotent, the second (duplicate) execution would break state." },
  { deck:"dist", front:"2PC phases", back:"(1) Prepare — everyone votes; (2) Commit/Abort — coordinator decides and notifies. Blocks if coordinator dies between phases." },
  { deck:"dist", front:"Two Generals problem", back:"Over a lossy channel, no finite protocol reaches guaranteed common knowledge of a single bit." },
  { deck:"dist", front:"At-least-once vs exactly-once", back:"At-least-once requires idempotent handlers. Exactly-once requires deduplication state (sequence numbers, transaction IDs)." },

  // SECURITY
  { deck:"sec", front:"Buffer overflow", back:"Writing past the end of a stack buffer can overwrite the saved return address, redirecting control flow to attacker-supplied bytes." },
  { deck:"sec", front:"W^X", back:"A page is Writable XOR eXecutable. Prevents injecting bytes into a buffer and jumping to them." },
  { deck:"sec", front:"setuid", back:"Executable's effective user id is that of the file's owner while running. Bugs in setuid-root programs = privilege escalation." },
  { deck:"sec", front:"Therac-25 facts", back:"Radiation therapy machine; software-only safety interlocks; 1980s; 1 programmer; massive overdoses (breast, hip, shoulder cases)." },
  { deck:"sec", front:"Ken Thompson trusting-trust", back:"Self-reproducing backdoor in the compiler binary. Source of the compiler is clean; the backdoor re-injects itself each time the compiler recompiles." },
  { deck:"sec", front:"Guard pages in malloc", back:"Place an unmapped page on either side of allocations so that out-of-bounds reads/writes fault immediately." },
  { deck:"sec", front:"Hard-link TOCTOU attack", back:"If a setuid program reads path P, checks permission, then opens P — an attacker can swap P's link in between. Use fstat on the open fd, not stat on the path." }
];

/* ============== QUIZ ITEMS ============== */
const QUIZ = [
  // ========== QUIZ 02 — processes, assembly ==========
  { set:"q02", type:"mc", tag:"Quiz 02",
    q:"A C function receives `int a` by value and `int* b` by pointer. Inside the function we do `a = a + 5; *b = 8;`. After the call returns, the caller's variable that was passed as `b`…",
    opts:["is unchanged","is 8","is whatever a was plus 5","becomes a pointer"],
    a:1,
    explain:"Pass-by-pointer lets the callee write through the pointer. The object `b` points to is now 8."},
  { set:"q02", type:"mc", tag:"Quiz 02",
    q:"After `fork()` returns successfully, both processes continue executing at…",
    opts:["main()","the top of the program","the instruction immediately following the fork","an interrupt handler"],
    a:2,
    explain:"Only the return value differs (0 child / pid parent); the PC is identical."},
  { set:"q02", type:"mc", tag:"Quiz 02",
    q:"Which is NOT a motivation for the process abstraction?",
    opts:["isolation","preemptive multitasking","hiding disk block layout from the CPU","running more programs than cores"],
    a:2,
    explain:"Disk layout is the file system's concern, not the process abstraction's."},
  { set:"q02", type:"mc", tag:"Quiz 02",
    q:"Consider the epilogue `movq %rbp,%rsp; popq %rbp` — after the popq, if 0xffff00 was at (%rbp before pop), what value is in %rbp now?",
    opts:["0xffff00","0","0xffd010","undefined"],
    a:0,
    explain:"popq loads the qword at the old %rsp into %rbp. The question states that's 0xffff00."},

  // ========== QUIZ 04 — threads ==========
  { set:"q04", type:"mc", tag:"Quiz 04",
    q:"Two threads p1,p2 with no synchronization: p1 does `x=1; use(x);`, p2 does `x=0;`. Without sequential consistency, can `use(0)` happen?",
    opts:["no","yes","only if threads are on the same core","only on single-core machines"],
    a:1,
    explain:"Memory reordering / store-buffer effects can make p1 observe x=0 after its own store of 1."},
  { set:"q04", type:"mc", tag:"Quiz 04",
    q:"A programmer writes `if (buffer_empty) cond_wait(&cv,&m);` to wait. What's wrong?",
    opts:[
      "Nothing — Mesa-style is always if.",
      "Spurious wakeups, stolen conditions, and multiple producers can all cause the waiter to proceed when the condition is false — must use while.",
      "cond_wait never returns.",
      "if requires broadcast."
    ],
    a:1,
    explain:"All three failure modes (a,b,c from the quiz) apply — hence `while`."},
  { set:"q04", type:"mc", tag:"Quiz 04",
    q:"count_nodes walks a linked list. Which invariant must be true at entry for correctness?",
    opts:[
      "No one else is modifying the list OR the caller holds the list's lock.",
      "head is NULL.",
      "The list has at least 10 nodes.",
      "The thread owns no locks."
    ],
    a:0,
    explain:"Unsynchronized concurrent mutation is a data race."},

  // ========== QUIZ 05 — Therac-25 ==========
  { set:"q05", type:"mc", tag:"Quiz 05",
    q:"Approximately how many programmers wrote the Therac-25 control software?",
    opts:["dozens","around 10","1","0 — it was all hardware"],
    a:2,
    explain:"A single programmer. No code review, no formal verification, race conditions in an 8-bit system."},
  { set:"q05", type:"mc", tag:"Quiz 05",
    q:"The Therac-25 incidents occurred primarily in which decade?",
    opts:["1960s","1970s","1980s","1990s"],
    a:2,
    explain:"1985–1987 machine in service; overdoses reported 1985–1987."},
  { set:"q05", type:"multi", tag:"Quiz 05",
    q:"Which body regions were injured in documented Therac-25 overdoses?",
    opts:["breast","hip","shoulder","ankle"],
    a:[0,1,2],
    explain:"Breast, hip and shoulder cases are all documented."},

  // ========== QUIZ 07 — virtual memory ==========
  { set:"q07", type:"mc", tag:"Quiz 07",
    q:"A hypothetical ISA has 52-bit VAs and a 2^11-byte page. How many bits in the page offset?",
    opts:["11","12","52","41"],
    a:0,
    explain:"Page size = 2^11 → 11-bit offset."},
  { set:"q07", type:"mc", tag:"Quiz 07",
    q:"Same 52-bit VA, 2^11 page, 52-bit PA. How many bits in the PPN?",
    opts:["11","41","52","9"],
    a:1,
    explain:"PA 52 bits − 11 offset = 41-bit PPN."},
  { set:"q07", type:"mc", tag:"Quiz 07",
    q:"A user memory reference causes a TLB miss but no page fault. Which is consistent?",
    opts:[
      "The PTE is not present.",
      "The PTE is present and permissions allow — the page walker refilled the TLB.",
      "Hardware bug.",
      "Only possible in kernel mode."
    ],
    a:1,
    explain:"Ordinary cold TLB miss → walker refill → no fault."},
  { set:"q07", type:"mc", tag:"Quiz 07",
    q:"App1 uses virtual addresses 0x100000–0x13FFFF. How many 4KB pages is that?",
    opts:["32","64","128","256"],
    a:1,
    explain:"0x40000 bytes = 2^18 = 64 × 4 KB."},
  { set:"q07", type:"mc", tag:"Quiz 07",
    q:"Minimum physical pages on x86-64 for a process using 12 KB = 3 data pages?",
    opts:["3","4","7","9"],
    a:2,
    explain:"3 data + L1 + L2 + L3 + L4 = 7."},

  // ========== QUIZ 08 — VM + context switch ==========
  { set:"q08", type:"mc", tag:"Quiz 08",
    q:"pageinfo[202].owner = 4, refcount = 1. This means:",
    opts:[
      "Process 4 has 202 pages.",
      "Physical page number 202 is owned by pid 4 with exactly one mapping.",
      "Physical page 4 is the 202nd allocated.",
      "Nothing — pageinfo is zero-indexed."
    ],
    a:1,
    explain:"pageinfo is indexed by PPN. Entry 202 is PPN 202."},
  { set:"q08", type:"mc", tag:"Quiz 08",
    q:"1200 keypresses/minute × 1 µs per interrupt. CPU fraction spent on keyboard interrupts?",
    opts:["0.2%","2%","0.002%","20%"],
    a:2,
    explain:"20 keys/sec × 1 µs = 20 µs / 1 sec = 2·10^−5 = 0.002%."},
  { set:"q08", type:"mc", tag:"Quiz 08",
    q:"HDDs have better sequential than random throughput.",
    opts:["true","false"], a:0,
    explain:"Random ≈ seek+rot, sequential = pure transfer. Huge ratio."},
  { set:"q08", type:"mc", tag:"Quiz 08",
    q:"SSDs have essentially no seek time.",
    opts:["true","false"], a:0,
    explain:"No mechanical movement; access is electrical."},
  { set:"q08", type:"mc", tag:"Quiz 08",
    q:"In a context switch via swtch(t1,t2), after saving t1's callee-saved registers on its stack, the switching trick is:",
    opts:[
      "copy registers into t2's PCB directly",
      "`movq (%rsi),%rsp` — load t2's saved stack pointer, then `popq` its registers",
      "jump through a trampoline in ring 0",
      "flip the GDT"
    ],
    a:1,
    explain:"Switching the stack pointer is the moment the CPU becomes the other thread."},

  // ========== MIDTERM 2025 fall ==========
  { set:"midterm25", type:"mc", tag:"Midterm 2025",
    q:"UNIX was originally developed at:",
    opts:["MIT","Bell Labs","Xerox PARC","Berkeley"], a:1,
    explain:"Thompson/Ritchie at Bell Labs on a PDP-7 then PDP-11."},
  { set:"midterm25", type:"mc", tag:"Midterm 2025",
    q:"A byte has how many distinct values?",
    opts:["128","255","256","512"], a:2,
    explain:"2^8 = 256 (0x00 through 0xff)."},
  { set:"midterm25", type:"mc", tag:"Midterm 2025",
    q:"Increasing a system's page size from 4 KB to 2 MB with everything else equal generally…",
    opts:[
      "decreases internal fragmentation",
      "increases internal fragmentation",
      "eliminates the need for a TLB",
      "shrinks the largest addressable virtual address"
    ],
    a:1,
    explain:"A larger page size means each process can waste up to nearly a full page per allocation unit."},
  { set:"midterm25", type:"mc", tag:"Midterm 2025",
    q:"After `dup2(fd,1)` and then three printf('W..Y..Z') followed by fork() — what output? (fd points to a single file)",
    opts:[
      "WWW YYY ZZZ",
      "output appears twice because of fork buffers",
      "nothing — dup2 closes stdout permanently",
      "only W"
    ],
    a:0,
    explain:"Redirect stdout into fd, then each printf lands in the file in program order."},
  { set:"midterm25", type:"mc", tag:"Midterm 2025",
    q:"myls prints directory entries but skips `.`. Given a dir with `.`, `..`, `rho`, `sigma` — what is printed?",
    opts:[
      "rho sigma",
      ".. rho sigma",
      ". .. rho sigma",
      "just ."
    ],
    a:1,
    explain:"Skip ONLY the current-dir entry, keep .. and normal entries."},

  // ========== MIDTERM 2026 spring ==========
  { set:"midterm26", type:"mc", tag:"Midterm 2026",
    q:"A critical section is:",
    opts:[
      "code run by only one thread",
      "a region of code that operates on shared state and must be mutually excluded",
      "any code with a lock",
      "a function marked `critical`"
    ],
    a:1,
    explain:"Definition centers on the invariant, not on whether a lock is visibly present."},
  { set:"midterm26", type:"mc", tag:"Midterm 2026",
    q:"Which x86 instructions are safe to use to build a spinlock primitive?",
    opts:[
      "mov alone",
      "lock xchg / lock cmpxchg",
      "test / jmp",
      "add"
    ],
    a:1,
    explain:"Atomicity + fence behavior; plain loads/stores can't."},
  { set:"midterm26", type:"mc", tag:"Midterm 2026",
    q:"A file descriptor is:",
    opts:[
      "a path string",
      "a small non-negative integer index into the kernel's per-process open-file table",
      "a pointer into disk blocks",
      "a handle into the shell"
    ],
    a:1,
    explain:"int from the kernel's per-process descriptor table."},
  { set:"midterm26", type:"mc", tag:"Midterm 2026",
    q:"`ls | grep foo` — how many processes are created and how are they connected?",
    opts:[
      "one process, internal loop",
      "two processes, connected by a pipe so ls's stdout becomes grep's stdin",
      "two processes with shared memory",
      "three processes: shell, ls, grep — but grep reads ls's file"
    ],
    a:1,
    explain:"Shell forks ls and grep; creates a pipe; dup2s ends; execs each side."},
  { set:"midterm26", type:"mc", tag:"Midterm 2026",
    q:"A 20-bit virtual address with a 4 KB page size → how many pages in the address space?",
    opts:["256","512","1024","256K/4 = 64K"], a:0,
    explain:"2^20 / 2^12 = 2^8 = 256 virtual pages."},

  // ========== FINAL 2019 ==========
  { set:"final19", type:"mc", tag:"Final 2019",
    q:"A 2^20-byte memory equals:",
    opts:["1 KB","1 MB","1 GB","1 TB"], a:1,
    explain:"2^20 = 1,048,576 bytes = 1 MiB."},
  { set:"final19", type:"mc", tag:"Final 2019",
    q:"A system call is:",
    opts:[
      "any function defined in <stdlib.h>",
      "the mechanism by which user code requests a service from the kernel — involving a mode switch",
      "a C++ method",
      "a hardware interrupt sent by a peripheral"
    ],
    a:1,
    explain:"User→kernel transition, typically via `syscall` / `int 0x80` on x86."},
  { set:"final19", type:"mc", tag:"Final 2019",
    q:"200 wpm typing at 7 letters/word yields roughly how many interrupts/sec?",
    opts:["2","23","120","1400"], a:1,
    explain:"200·7 / 60 ≈ 23 per second."},
  { set:"final19", type:"mc", tag:"Final 2019",
    q:"At 23 interrupts/sec with a per-interrupt cost of 1 µs — interrupts or polling?",
    opts:["polling — too many interrupts","interrupts — negligible overhead","polling — saves battery","doesn't matter"],
    a:1,
    explain:"23·10^−6 s/s = 0.0023% CPU. Interrupts win."},
  { set:"final19", type:"multi", tag:"Final 2019",
    q:"Uses of mmap:",
    opts:[
      "fast file I/O without syscalls in the steady state",
      "shared memory between processes",
      "networking TCP packets",
      "loading executables",
      "fast SSH"
    ],
    a:[0,1,3],
    explain:"File-backed I/O, shared mapping, program loading. NOT networking."},

  // ========== FINAL 2020 ==========
  { set:"final20", type:"mc", tag:"Final 2020",
    q:"Signature of `read` in POSIX:",
    opts:[
      "int read(char* buf)",
      "ssize_t read(int fd, void* buf, size_t count)",
      "int read(FILE*, char*, int)",
      "void read(fd, buf)"
    ],
    a:1,
    explain:"Returns bytes read (or -1/errno)."},
  { set:"final20", type:"mc", tag:"Final 2020",
    q:"Two threads in the same process have the same %cr3 because:",
    opts:[
      "threads always share %cr3",
      "threads of the same process share one address space — one page table",
      "the kernel uses process-wide registers",
      "x86 requires it"
    ],
    a:1,
    explain:"Threads share the process's address space; %cr3 points to its root page table."},
  { set:"final20", type:"mc", tag:"Final 2020",
    q:"A process mmaps a 5 KB file for reading. How many user-visible PTEs and physical pages does the OS commit on first touch?",
    opts:["1 PTE, 1 page","2 PTEs, 2 pages (5 KB spans two 4 KB pages)","5 pages","0 — it's lazy forever"],
    a:1,
    explain:"5 KB straddles a page boundary → 2 PTEs, 2 physical pages backing it."},
  { set:"final20", type:"mc", tag:"Final 2020",
    q:"ZFS vs EXT4 crash semantics — why does ZFS give atomic-ish snapshots?",
    opts:[
      "ZFS is faster",
      "Copy-on-write: new state is written to fresh blocks; a single root-pointer flip atomically commits",
      "EXT4 doesn't journal",
      "ZFS writes slower"
    ],
    a:1,
    explain:"COW keeps a consistent old state intact until one pointer flip publishes the new state."},

  // ========== FINAL 2021 ==========
  { set:"final21", type:"mc", tag:"Final 2021",
    q:"`uint64_t* multiply_by_3(uint64_t x){ uint64_t r = x*3; return &r; }` — bug?",
    opts:["no bug","returns a pointer to a local variable (dead stack)","multiplies wrong","needs malloc for int"],
    a:1,
    explain:"r is on multiply_by_3's stack frame; the frame is torn down on return."},
  { set:"final21", type:"mc", tag:"Final 2021",
    q:"File block 8225 in the Lab 5 inode lives in which region?",
    opts:["direct","indirect","double-indirect","triple-indirect"],
    a:2,
    explain:"8225 − 10 − 1024 = 7191 ≥ 0 → double-indirect. Outer 7, inner 23."},
  { set:"final21", type:"mc", tag:"Final 2021",
    q:"Write-behind journaling is broken because:",
    opts:[
      "it's too slow",
      "it checkpoints BEFORE writing the journal, so a crash between them leaves data modified with no log entry",
      "it requires RAID",
      "it loses the superblock"
    ],
    a:1,
    explain:"Breaks the write-ahead invariant."},
  { set:"final21", type:"mc", tag:"Final 2021",
    q:"A RAID-1 array of two 2-TB disks has how much usable capacity?",
    opts:["4 TB","2 TB","1 TB","depends on firmware"],
    a:1,
    explain:"Mirror: both disks hold identical content → capacity equals one disk."}
];

/* ============== PRACTICE PROBLEMS ============== */
const PROBS = [
  { num:"P1", src:"HW 9 — Disk scheduling",
    q:"Disk requests arrive for tracks 10, 22, 20, 2, 40, 6, 38 in that order. Seek cost = 6 ms/track. Head starts at track 20. Seek time for SSTF and LOOK?",
    sol:"SSTF from 20: nearest is 22 (2), then 10 (12), 6 (4), 2 (4), 38 (36), 40 (2). Seeks: 2+12+4+4+36+2 = 60 tracks × 6 ms = 360 ms.\n\nLOOK from 20 moving up: 22, 38, 40 (distances 2,16,2 = 20), then reverse down: 10, 6, 2 (distances 30,4,4 = 38). Total 58 tracks × 6 ms = 348 ms.\n\n(Exact numbers can vary by convention; the method is: minimize wasted travel by servicing everything in the current direction first.)" },

  { num:"P2", src:"HW 9 — Disk capacity",
    q:"Disk: 12000 RPM, 10 platters & 10 heads, 1024 sectors/track, 4096 tracks/platter, 512 B/sector, 15 ms avg seek. State: (a) capacity, (b) sequential BW, (c) long-term random BW.",
    sol:"(a) 10 × 4096 × 1024 × 512 B = 10 × 2·10^9 B ≈ 20 GB (2·10^10 B).\n\n(b) At 12000 RPM, 1 track/revolution passes the head every 5 ms. Each track = 1024·512 = 512 KB. BW = 512 KB / 5 ms ≈ 100 MB/s.\n\n(c) Per request: 15 ms seek + 2.5 ms rotational avg = 17.5 ms. Transfer = 512 B. Rate = 512 / 0.0175 s ≈ 29 KB/s. This is the classic 3-4 orders of magnitude gap between sequential and random." },

  { num:"P3", src:"HW 8 — VM warmup",
    q:"Fill in the table: n=20 VA bits, P=4 KB. Number of PTEs in a flat (single-level) page table?",
    sol:"VPN bits = 20 − 12 = 8. PTEs = 2^8 = 256." },

  { num:"P4", src:"HW 8 — x86-64 page-table sizing",
    q:"A process makes 2^9 + 1 allocations of 4 KB each. Minimum physical pages consumed, including page tables? (x86-64, 4-level, 4 KB pages, 8-byte PTEs.)",
    sol:"Data: 2^9 + 1 = 513 pages.\nL1 pages: ceil(513 / 512) = 2.\nL2: 1. L3: 1. L4: 1.\nTotal = 513 + 2 + 1 + 1 + 1 = 518." },

  { num:"P5", src:"HW 8 — TLB, page faults",
    q:"After context switch the TLB is empty. All data pages are on disk. Code at 0x500:\n  movq 0x200000, %rax\n  incq %rax, 1\n  movq %rax, 0x300000\nHow many TLB misses? How many page faults?",
    sol:"Three instruction fetches hit three instruction pages (might share a page — assume 1 for code). TLB misses for: the code page (1), data page 0x200000 (1), data page 0x300000 (1) → 3.\n\nPage faults: both data pages (0x200000 and 0x300000) are on disk → 2 faults. The code page is already resident.\n\n(Count varies with assumptions about whether the code page is already in the TLB — the question says 'empty'.)" },

  { num:"P6", src:"HW 8 — Interrupts vs polling",
    q:"Typing 200 wpm × 7 letters = 1400 letters/min. 1 µs per keyboard interrupt. Poll = 1 µs every 200 ms. Max acceptable human lag = 100 ms. Should the OS use interrupts or polling?",
    sol:"Interrupt rate = 1400/60 ≈ 23/s. CPU% = 23·10^−6 s/s = 0.0023%. Totally negligible.\n\nPolling every 200 ms means a keystroke could wait up to 200 ms — violates the 100 ms bound.\n\nUse INTERRUPTS." },

  { num:"P7", src:"HW 7 — PTE permissions (T/F)",
    q:"State whether each is Always/Sometimes/Never true:\n(a) A page fault implies the same reference caused a TLB miss.\n(b) A user-mode TLB miss implies a page fault.\n(c) PTE_P|PTE_U set → loads are permissible.\n(d) PTE_P|PTE_U set → stores are permissible.",
    sol:"(a) ALWAYS. If there had been a valid TLB entry, the access would have succeeded.\n(b) SOMETIMES. Usually the walker fills the TLB from the page table and no fault occurs; a fault occurs only if the walk itself fails.\n(c) ALWAYS. Present+user-accessible allows reads.\n(d) SOMETIMES. Only if PTE_W is also set — PTE_U says user can access, PTE_W controls writability." },

  { num:"P8", src:"HW 10 — File system math",
    q:"Inode has 8 direct block pointers + 1 indirect. 1024 B blocks, 4 B block pointers. Maximum file size? Directory max number of files when each entry is 14 B name + 2 B inode#?",
    sol:"Max file size: direct = 8·1024 = 8 KB. Indirect block holds 1024/4 = 256 pointers, each pointing to 1024 B → 256·1024 = 256 KB. Total = 8 KB + 256 KB = 264 KB (or 8·2^10 + 2^18).\n\nDirectory entry = 16 B. Max file size = 264 KB → 264 KB / 16 B = 16896 entries ≈ 2^14 · something. Straightforward division." },

  { num:"P9", src:"HW 10 — Max file size logic",
    q:"Why is it a bad idea to blow up N_DIRECT to 2^23 slots to 'avoid seeks to indirect blocks on big files'?",
    sol:"Every inode would balloon to 2^23 · 4 B = 32 MB. Small files (the common case) now pay 32 MB of wasted inode space. You'd spend almost all of disk on inodes that are mostly empty and evict many more inodes from the inode cache per read." },

  { num:"P10", src:"HW 11 — Crash recovery / redo-undo",
    q:"Why can't we drop the undo pass and use only redo (of committed transactions)?",
    sol:"Because without undo, a crash can leave a partial on-disk change from a transaction that later didn't commit. Pure redo replays only committed transactions — so it can't erase the effects of the dead transaction. The undo pass rolls those back before the redo pass tries to reach the post-commit state." },

  { num:"P11", src:"HW 11 — Write-behind journaling",
    q:"Your friend proposes: write to the journal ONLY AFTER checkpointing the data. Recovery undoes anything that lacks TxnEnd. Does this work?",
    sol:"No. Between checkpointing the data and writing the journal entry, a crash leaves the on-disk data modified with no log record at all. Recovery sees no 'incomplete' transaction and leaves the corruption in place. The write-ahead invariant (log BEFORE data) is load-bearing." },

  { num:"P12", src:"Lab 4 — fork() walkthrough",
    q:"Sketch the fork() implementation for WeensyOS.",
    sol:"1) find free slot in processes[] (skip 0). If none return -1.\n2) child = copy_pagetable(parent).\n3) for each VA in the parent's PTEs: if it's present+user+writable, allocate a new physical page P, memcpy(parent page → P), map P in child with same perms, and set pageinfo[P].owner=child_pid, refcount=1. Read-only shared pages may be shared with bumped refcount.\n4) copy parent's registers into child's regs, set child->regs.reg_rax = 0.\n5) child->state = P_RUNNABLE. return child_pid (to parent)." },

  { num:"P13", src:"Midterm 2026 — SharedArray producer/consumer",
    q:"A SharedArray has a mutex + cond_var + fixed array buf[]. Producers add values; consumers remove them. What's the invariant and the wait discipline?",
    sol:"Invariant (under the lock): 0 ≤ count ≤ MAX. Buffer entries [0, count) are valid.\nproducer: lock; while (count == MAX) cond_wait(not_full); buf[count++] = x; cond_broadcast(not_empty); unlock.\nconsumer: lock; while (count == 0) cond_wait(not_empty); x = buf[--count]; cond_broadcast(not_full); unlock." },

  { num:"P14", src:"Midterm 2025 — Hopping stones (monitor)",
    q:"Many 'stone' threads cross a narrow bridge that holds at most K stones at once. Guarantee mutual exclusion on capacity and FIFO order.",
    sol:"State: int on_bridge=0; queue<id>; cv turn; cv space.\nenter(): lock; queue.push(me); while (queue.front()!=me || on_bridge==K) cond_wait(turn, lock); queue.pop(); on_bridge++; cond_broadcast(turn); unlock.\nexit(): lock; on_bridge--; cond_broadcast(turn); unlock." },

  { num:"P15", src:"HW 5 — Reader-writer spinlock",
    q:"Complete reader_release, writer_acquire, writer_release using the given atomics.",
    sol:"reader_release(lock): atomic_decrement(&lock->value);\nwriter_acquire(lock): while (cmpxchg_val(&lock->value, 0, -1) != 0) {}\nwriter_release(lock): lock->value = 0;   // (or atomic store; SC assumed)" },

  { num:"P16", src:"HW 5 — Deadlock in transfer()",
    q:"Given mutex mtx[2] for alice(0), bob(1). transfer locks mtx[from] then mtx[to]. Show a deadlock, then fix.",
    sol:"Deadlock: T1 transfer(alice→bob) locks mtx[0]. T2 transfer(bob→alice) locks mtx[1]. Each waits for the other's lock forever.\n\nFix: enforce a total order — always lock the lower-indexed mutex first. Rewrite:\n  int lo = min(from,to), hi = max(from,to);\n  lock(mtx[lo]); lock(mtx[hi]); ...; unlock(mtx[hi]); unlock(mtx[lo]);" },

  { num:"P17", src:"Final 2019 — Buffer overflow",
    q:"Line 24 of a setuid-root program reads a line with an unbounded scanf into a 64-byte stack buffer. Why is this a root-level exploit?",
    sol:"The 64-byte read can overflow the buffer and overwrite the saved %rbp and return address on the stack. The attacker supplies a payload whose bytes past the buffer include a return target that runs shellcode (or ROP gadgets) in the process's own memory. Because the program is setuid-root, the attacker's code runs as root." },

  { num:"P18", src:"Final 2020 — Seek computation",
    q:"Track requests 98, 183, 37, 122, 14, 124, 65, 67. Head starts at 53. Compute total seek cost for SSTF.",
    sol:"From 53: nearest 65 (12), 67 (2), 37 (30), 14 (23), 98 (84), 122 (24), 124 (2), 183 (59). Total = 12+2+30+23+84+24+2+59 = 236 tracks. (Multiply by ms/track to get time.)" },

  { num:"P19", src:"Final 2021 — passwd TOCTOU attack",
    q:"A setuid-root `mypasswd` does: stat(path); if owner==me, open(path); write.  Describe the attack.",
    sol:"Between stat() and open(), the attacker replaces `path` with a hard link or symlink pointing at /etc/shadow. stat's owner check passed before; now open() gets a file descriptor to /etc/shadow as root. Fix: open first, then fstat on the fd (and verify owner on that fd)." },

  { num:"P20", src:"WeensyOS — kernel_pagetable construction",
    q:"Walk through setting up kernel_pagetable so virtual addresses below PROC_START_ADDR are identity-mapped, the CGA console is user-accessible, and everything else is kernel-only.",
    sol:"for (uintptr_t va=0; va<PROC_START_ADDR; va+=PAGESIZE) {\n    int perm = PTE_P | PTE_W;\n    if (va == (uintptr_t)console) perm |= PTE_U;\n    virtual_memory_map(kernel_pagetable, va, va, PAGESIZE, perm, NULL);\n}\nvirtual_memory_map(kernel_pagetable, KERNEL_STACK_TOP-PAGESIZE, KERNEL_STACK_TOP-PAGESIZE, PAGESIZE, PTE_P|PTE_W, NULL);\n// user-area VAs are left unmapped or kernel-only per design." }
];

/* ============== GLOSSARY ============== */
const GLOSS = [
  ["address space","The set of virtual addresses a process can reference. One per process; may grow/shrink."],
  ["atomic","An operation that completes as a single indivisible step w.r.t. concurrent access. Hardware: `lock` prefix on x86."],
  ["bitmap (FS)","Per-disk-block free map. Bit i = 1 iff block i is free. Lab 5: starts at block 1."],
  ["block (FS)","FS-level allocation unit (≥ sector). Lab 5: 4096 B."],
  ["buffer cache","Kernel cache of recently used disk blocks, keyed by (device, block#)."],
  ["callee-saved register","Register that a callee must restore before returning: %rbx, %rbp, %r12–%r15."],
  ["caller-saved register","Register the caller must save if it wants preserved: %rax, %rcx, %rdx, %rsi, %rdi, %r8–%r11."],
  ["cmpxchg","Compare-and-swap. `lock cmpxchg` is atomic, foundational for lock-free primitives."],
  ["condition variable","Synchronization primitive paired with a mutex. wait() releases the lock + blocks; signal() wakes one waiter."],
  ["context switch","Kernel operation that saves one thread's CPU state and restores another's; includes an address-space switch when threads are in different processes."],
  ["copy-on-write","Lazy copy — clones share pages; first write triggers a real copy. Used by fork and by FS snapshots."],
  ["%cr3","x86-64 control register holding the physical address of the current top-level page table."],
  ["critical section","Region that touches shared state; must be mutually excluded."],
  ["deadlock","Set of threads each waiting for a lock held by another. Coffman: mutex + hold&wait + no preempt + cycle."],
  ["demand paging","Allocate physical pages only when first touched; PTEs start as not-present."],
  ["direct block","Disk block number stored directly in an inode slot. Lab 5: i_direct[0..9]."],
  ["dirent","Directory entry: (name, inum) pair. Directories are files whose content is a sequence of dirents."],
  ["double-indirect block","Block of pointers to indirect blocks. Expands addressable file size by 1024·1024 blocks in Lab 5."],
  ["dup2","Duplicate an fd onto a specific slot, closing that slot first. Core of shell redirection."],
  ["ELF","Executable and Linkable Format — standard binary layout on Linux."],
  ["exec","Replace address space with a new program. Keeps pid, fd table."],
  ["fd / file descriptor","Small int indexing the kernel's per-process open-file table."],
  ["FCFS","First-come-first-served scheduling."],
  ["file system","Software that imposes a tree of named files on a block device."],
  ["fork","Syscall that creates a near-duplicate of the caller. Returns 0 to child, child pid to parent."],
  ["FUSE","Kernel module + library that lets a user-space process implement a filesystem."],
  ["hard link","Directory entry pointing at an existing inode. Increments the inode's link count."],
  ["HDD","Hard disk drive. Mechanical: platters, heads, seek, rotational latency."],
  ["idempotent","f(x); f(x) == f(x). Required for safe retry (NFS)."],
  ["indirect block","Block of 1024 disk block numbers. Extends file addressing past the direct region."],
  ["inode","Per-file metadata + block pointers. Filename lives in the directory, not the inode."],
  ["interrupt","Asynchronous hardware signal that forces the CPU into a handler. Alternative to polling."],
  ["IPC","Inter-process communication. Pipes, sockets, shared memory, signals."],
  ["journaling","Crash-recovery technique. Write intent to a log before mutating data; replay log on recovery."],
  ["kernel","Privileged mode code that manages hardware and provides syscalls."],
  ["MLFQ","Multi-level feedback queue scheduler. Demote on quantum exhaustion, periodic priority boost."],
  ["mmap","Map a file (or anonymous region) into a process's VA space."],
  ["monitor","Abstraction: a lock + one or more CVs + methods that run under the lock. Dahlin-style."],
  ["mutex","Lock: at most one holder at a time."],
  ["NFS","Network File System. Stateless-ish RPC protocol requiring idempotent operations."],
  ["page","Unit of VM allocation/translation. x86-64: 4 KB default."],
  ["page fault","Fault taken when MMU can't complete a translation (not-present, permission, etc.)."],
  ["page table","Multi-level tree mapping VPNs to PPNs + flags. x86-64: 4 levels, 9 bits each."],
  ["PCB","Process control block. Kernel's per-process struct holding pid, state, regs, fds, page-table ptr."],
  ["PID","Process identifier. Small positive int."],
  ["pipe","Kernel-buffered unidirectional byte channel. Two fds: read end and write end."],
  ["POSIX","Standardized UNIX API (fork, exec, open, read, etc.)."],
  ["PPN / PFN","Physical page number. PA >> page_shift."],
  ["preemption","Forcible context-switch away from a running thread."],
  ["process","One running program instance: pid + address space + fds + regs."],
  ["PTE","Page table entry. Holds a PPN + flag bits (PTE_P, PTE_W, PTE_U, ...)"],
  ["PTE_P","Present bit. If 0, access → page fault."],
  ["PTE_U","User-accessible. If 0, ring-3 access → page fault."],
  ["PTE_W","Writable. If 0, write → page fault."],
  ["RAID","Redundant array of independent disks. RAID-1 = mirroring; RAID-5 = parity."],
  ["readers-writers","Sync pattern: many readers OR one writer. Lab exercise."],
  ["redo log","Log used by write-ahead journaling. Record new values; on recovery replay committed txns."],
  ["round-robin","Fair-quantum scheduler. Each runnable thread gets one quantum in turn."],
  ["SCAN / elevator","Disk scheduler sweeping head in one direction then reversing."],
  ["sector","Smallest unit a disk reads/writes. Often 512 B."],
  ["sequential consistency","Model where all threads see some global interleaving of memory operations preserving per-thread program order."],
  ["setuid","Executable bit that causes the process to run with the file owner's effective uid."],
  ["signal (cv)","Wake up one thread blocked in cond_wait."],
  ["soft link / symlink","File whose content is a path string. May dangle; may cross filesystems."],
  ["spinlock","Lock implemented by busy-waiting. Usable in interrupt handlers; wastes CPU if held long."],
  ["SSD","Solid-state drive. No seek, no rotation, but wear-leveling and erase-block granularity."],
  ["SSTF","Shortest seek-time first. Disk scheduling; can starve."],
  ["superblock","Block containing the FS's global metadata. Lab 5: block 0."],
  ["syscall","User→kernel transition requesting a kernel service. x86-64: `syscall` instruction."],
  ["swtch()","Low-level assembly routine swapping saved register state of two threads; the stack-pointer swap is the moment of the switch."],
  ["Therac-25","1980s radiation-therapy machine whose software-only interlocks and race conditions caused massive overdoses."],
  ["thread","Schedulable unit within a process. Shares address space, fds, etc. with its siblings."],
  ["TLB","Translation lookaside buffer. CPU cache of VA→PA mappings + flags."],
  ["TOCTOU","Time-of-check-to-time-of-use race. Classic in setuid programs that stat then open."],
  ["trusting trust","Ken Thompson's self-reproducing compiler backdoor."],
  ["Two Generals","Impossibility result: no finite protocol reaches certain agreement over a lossy channel."],
  ["undo log","Log storing old values. On recovery, roll back txns that didn't commit."],
  ["VFS","Kernel's generic file-system interface. Each FS implements it."],
  ["virtual memory","Abstraction giving each process the illusion of a private, large contiguous address space."],
  ["VPN","Virtual page number. VA >> page_shift."],
  ["W^X","Write XOR eXecute. Page is never both writable and executable."],
  ["WeensyOS","Minimal x86-64 teaching OS used in Lab 4."],
  ["write-ahead","Invariant: durability of the log precedes durability of the data."]
];

/* ============== FORMULAS ============== */
const FORMULAS = [
  { h:"Page arithmetic (4 KB page)", eq:"page_num  = addr >> 12\noffset    = addr & 0xFFF\naddr      = (page_num << 12) | offset", note:"For any page size P=2^k, substitute k." },
  { h:"x86-64 page-table indexes",    eq:"L1 = (va >> 39) & 0x1FF\nL2 = (va >> 30) & 0x1FF\nL3 = (va >> 21) & 0x1FF\nL4 = (va >> 12) & 0x1FF\noff= va & 0xFFF", note:"9 bits per level, 4 KB page." },
  { h:"Entries per page table",        eq:"PAGESIZE / PTE_SIZE = 4096 / 8 = 512", note:"That's why the architecture uses 9 bits per level." },
  { h:"Min phys pages for a process",  eq:"data + L1 + L2 + L3 + L4\nL1_pages = ceil(data_pages / 512)\nL2_pages = ceil(L1_pages / 512)   etc.", note:"For very small processes this is 4 page-table pages + the data." },
  { h:"Max file size (Lab 5)",         eq:"(N_DIRECT + 1024 + 1024·1024) · BLKSIZE\n= (10 + 2^10 + 2^20) · 4096 ≈ 4 GB", note:"With double-indirect." },
  { h:"Double-indirect indexing",      eq:"rel    = filebno − N_DIRECT − 1024\nouter  = rel / 1024\ninner  = rel % 1024", note:"Only for filebno in the double-indirect range." },
  { h:"Avg rotational latency",        eq:"T_rot = 60 / (2 · RPM) seconds", note:"Half a revolution." },
  { h:"Sequential HDD bandwidth",      eq:"BW = sectors_per_track · sector_size · RPM / 60", note:"Per-head; multiply by heads if you're reading in parallel." },
  { h:"Long-term random HDD rate",     eq:"R = bytes_per_read / (avg_seek + avg_rot + xfer)", note:"Dominated by seek+rot on HDDs." },
  { h:"HDD capacity",                  eq:"C = heads · tracks · sectors · sector_size", note:"(= platters · 2 · tracks · sectors · sector_size if two-sided.)" },
  { h:"Interrupt rate from typing",    eq:"rate = words_per_min · letters_per_word / 60\nCPU%  = rate · t_handler", note:"200 wpm · 7 / 60 ≈ 23/s." },
  { h:"RAID-1 capacity",               eq:"C_array = C_one_disk", note:"Mirror stores identical data on each disk." },
  { h:"SSTF / SCAN seek cost",         eq:"T_seek = sum(|curr−next|) · ms_per_track", note:"For SCAN, reverse direction when no requests remain ahead." },
  { h:"Memory consistency — SC",       eq:"execution ≡ some global interleaving\nwhere each thread's ops preserve\nprogram order", note:"Without SC, almost anything is legal." },
  { h:"Byte/bit capacity",             eq:"1 KiB = 2^10   1 MiB = 2^20\n1 GiB = 2^30   1 TiB = 2^40\n1 byte = 2^8 = 256 values", note:"Binary (not decimal) prefixes." },
  { h:"Pipe-based shell redirection",  eq:"pipe(p); if(!fork()){dup2(p[1],1);close both; exec(L);}\nif(!fork()){dup2(p[0],0);close both; exec(R);}\nclose both ends; wait twice.", note:"`L | R`." },
  { h:"Hit rate / miss rate",          eq:"EAT = hit · t_cache + miss · t_mem\nmiss = 1 − hit", note:"Works for TLB, cache, buffer cache." },
  { h:"Quantum arithmetic (RR)",       eq:"avg_response ≤ N · q\nwhere N=runnable threads, q=quantum", note:"Small q = low latency, high overhead." },
  { h:"Deadlock prevention",           eq:"break any of: mutex, hold&wait,\nno preemption, circular wait.", note:"Total lock order kills circular wait." },
  { h:"2PC round count",               eq:"2 phases · 2 messages each way = 4 RT msgs\nper participant, no failures.", note:"Blocks if coordinator dies after PREPARE." },
  { h:"Zero-copy I/O — forgotten",     eq:"pinning + physical contiguity.", note:"VAs can move (paging), DMA needs fixed PAs. Pin the pages for the duration." },
  { h:"inode_block_walk case split",   eq:"if filebno<10      : &ino->i_direct[filebno]\nelif filebno<10+1024: &indirect[filebno-10]\nelse                 : double-indirect math", note:"Alloc intermediate if alloc=true." }
];

/* ============== CHEAT SHEET CONTENT ============== */
const CHEAT_PAGES = [
  // ---------- PAGE 1 ----------
  `<div class="cs-page">
    <div class="cs-title">cs202 · cheat sheet · page 1/2</div>
    <div class="cs-sub2">processes · concurrency · virtual memory · context switch</div>
    <div class="cs-col">
      <div class="cs-h">Processes &amp; fork</div>
      <div class="cs-sub">fork()</div>
      <pre>returns 0 to child, child-pid to parent, -1 err
both resume at instruction AFTER fork.
FDs duplicated (shared offsets). Memory: COW.</pre>
      <div class="cs-sub">exec*()</div>
      <pre>replaces VA space with new program.
Does not return on success.
Keeps pid, open fds (unless FD_CLOEXEC).</pre>
      <div class="cs-sub">pipe + dup2 + shell redirection</div>
      <pre>pipe(p); // p[0] read, p[1] write
cmd &gt; f : fd=open(f,O_CREAT|O_TRUNC|O_WR);
          dup2(fd,1); close(fd); exec(cmd);
L | R   : pipe(p); fork→dup2(p[1],1);exec(L);
          fork→dup2(p[0],0);exec(R);
          parent close(both); wait twice.</pre>

      <div class="cs-h">x86-64 essentials</div>
      <pre>args:  rdi rsi rdx rcx r8 r9   ret: rax
callee-saved: rbx rbp r12-r15
caller-saved: rax rcx rdx rsi rdi r8-r11
prologue: pushq %rbp ; movq %rsp,%rbp ; subq $N,%rsp
epilogue: movq %rbp,%rsp ; popq %rbp ; retq
callq: rsp -=8, *(rsp)=retaddr, jmp
retq : rip = *(rsp), rsp +=8</pre>

      <div class="cs-h">Concurrency</div>
      <div class="cs-sub">mutex + cv (Mesa)</div>
      <pre>lock(m);
while (!cond) cond_wait(cv, m);
// act
cond_signal(cv2);         // broadcast if many may proceed
unlock(m);</pre>
      <div class="cs-sub">Dahlin's 4 commandments</div>
      <pre>1 every invariant bound to a lock
2 wait in \`while\`, never \`if\`
3 total lock order, everywhere
4 no races: shared R/W under the lock</pre>
      <div class="cs-sub">Deadlock (Coffman)</div>
      <pre>mutex + hold&amp;wait + no-preempt + cycle
break ANY one → no deadlock.
Standard fix: total order on locks.</pre>
      <div class="cs-sub">Atomics</div>
      <pre>lock xchg / lock cmpxchg / lock decl
sequential consistency: SOME global interleaving
                        respecting program order</pre>

      <div class="cs-h">Virtual memory (x86-64)</div>
      <pre>page = 4 KB = 2^12.  4-level PT, 9 bits each.
512 PTEs per table = 4KB/8B
%cr3 → phys addr of L1 page.
L1=(va>>39)&amp;0x1FF  L2=(va>>30)&amp;0x1FF
L3=(va>>21)&amp;0x1FF  L4=(va>>12)&amp;0x1FF
off= va &amp; 0xFFF.
PTE flags: P (present) W U (user).
fault if: !P | write&amp;&amp;!W | user&amp;&amp;!U.
TLB miss ⇒ walker; miss ⇏ fault.
fault ⇒ miss (always).</pre>
      <div class="cs-sub">Min pages, 12 KB process</div>
      <pre>3 data + 4 page-table pages = 7</pre>
      <div class="cs-sub">Page table for N data pages</div>
      <pre>data  + ceil(data/512) + 1 + 1 + 1</pre>

      <div class="cs-h">Context switch (swtch)</div>
      <pre>pushq %rbp               # save callee-saved
pushq %r15 … %rbx
movq  %rsp, (%rdi)       # save old sp into t1
movq  (%rsi), %rsp       # load new sp from t2
popq  %rbx … %r15
popq  %rbp
retq                     # returns INTO t2 code</pre>
    </div>
  </div>`,

  // ---------- PAGE 2 ----------
  `<div class="cs-page">
    <div class="cs-title">cs202 · cheat sheet · page 2/2</div>
    <div class="cs-sub2">disks · file systems · crash recovery · distributed · security</div>
    <div class="cs-col">
      <div class="cs-h">Scheduling</div>
      <pre>FCFS  — arrival order
RR    — fixed quantum q
SSTF  — shortest seek (starvation risk)
SCAN/LOOK — elevator; LOOK reverses early
MLFQ  — demote on quantum, periodic boost</pre>

      <div class="cs-h">Disk perf</div>
      <pre>T_access ≈ seek + 60/(2·RPM) + xfer
seq BW  = sectors/track · bytes · RPM / 60
rand RT ≈ seek + rot + tiny xfer
HDD sequential ≫ random  (10³×)
SSD: no seek, erase-block granularity,
     wear leveling; seq > rand (small factor)
Capacity = heads · tracks · sectors · bytes
RAID-1 mirror: usable = one disk capacity</pre>

      <div class="cs-h">Polling vs interrupts</div>
      <pre>low rate → interrupts (negligible)
very high rate → switch to polling
polling lag ≤ interval/2, bound carefully</pre>

      <div class="cs-h">File system (Lab 5)</div>
      <pre>BLKSIZE = 4096  N_DIRECT = 10
block 0  = superblock
block 1+ = free-block bitmap (4KB·8 = 32768 bits/blk)
inode has: direct[0..9], indirect, double
max file ≈ (10 + 1024 + 1024·1024) · 4096 ≈ 4 GB
directory = sequence of dirents (name,inum)

filebno → slot:
 if filebno &lt; 10             → i_direct[filebno]
 elif filebno &lt; 10+1024      → indirect[filebno-10]
 else                         → double-indirect
   rel   = filebno - 10 - 1024
   outer = rel / 1024,  inner = rel % 1024</pre>
      <div class="cs-sub">inode_block_walk vs inode_get_block</div>
      <pre>walk    → sets *ppdiskbno = addr of slot holding blk#
get_blk → uses walk, allocs if 0, sets blk ptr</pre>
      <div class="cs-sub">hard link vs symlink</div>
      <pre>hard: extra dirent → same inode; inc link count
sym : a file whose content is a path string</pre>

      <div class="cs-h">Crash recovery</div>
      <pre>redo (write-ahead):
 write log (TxnBegin, entries, TxnEnd) BEFORE
 checkpointing. Recovery = redo committed txns.
undo:
 log OLD value before modify. Recovery = undo
 txns lacking TxnEnd.
COW (ZFS): never overwrite; flip root pointer.
write-behind journaling: BROKEN —
 data changes before log → crash leaves state
 modified with no record to undo.</pre>

      <div class="cs-h">Distributed</div>
      <pre>NFS: at-least-once RPCs + idempotent server.
2PC: PREPARE → votes → COMMIT/ABORT.
     Blocks on coordinator crash after votes.
Two Generals: no guaranteed agreement over
     lossy channel with finite msgs.</pre>

      <div class="cs-h">Security</div>
      <pre>buffer overflow → overwrite saved return addr.
W^X: page is writable XOR executable.
setuid: effective uid = file owner. Root bugs = pwn.
TOCTOU: stat then open ⇒ race. Use fstat on fd.
Therac-25: 1 programmer, 1980s, race conditions,
  injuries incl. breast / hip / shoulder.
Ken Thompson: self-reproducing compiler backdoor.</pre>

      <div class="cs-h">Unit quick ref</div>
      <pre>2^10 = 1Ki   2^20 = 1Mi   2^30 = 1Gi
byte = 2^8 = 256 values
4 KB page → 12-bit offset
µs = 10^-6 s,  ms = 10^-3 s
avg rot @ 12000 rpm = 2.5 ms</pre>
    </div>
  </div>`
];
