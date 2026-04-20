/** Mock queue platform state */
export const INITIAL_STATE = {
  accounts: [
    { id: "acc_01", name: "Acme Corp", created: "2026-01-01" },
    { id: "acc_02", name: "StartupX", created: "2026-02-15" },
  ],
  user: {
    id: "u_me",
    name: "Aarav Mehta",
    email: "aarav@acmecorp.io",
    account: "Acme Corp",
    accountId: "acc_01",
  },
  /** People on an account; role drives RBAC (see accountAccess.js). */
  accountMembers: [
    { id: "m_01", accountId: "acc_01", userId: "u_me", email: "aarav@acmecorp.io", name: "Aarav Mehta", role: "owner", joinedAt: "2026-01-01" },
    { id: "m_02", accountId: "acc_01", userId: "u_jordan", email: "jordan@acmecorp.io", name: "Jordan Lee", role: "admin", joinedAt: "2026-01-10" },
    { id: "m_03", accountId: "acc_01", userId: "u_sam", email: "sam@acmecorp.io", name: "Sam Rivera", role: "viewer", joinedAt: "2026-02-01" },
    { id: "m_04", accountId: "acc_02", userId: "u_me", email: "aarav@acmecorp.io", name: "Aarav Mehta", role: "owner", joinedAt: "2026-02-15" },
    { id: "m_05", accountId: "acc_02", userId: "u_taylor", email: "taylor@startupx.io", name: "Taylor Kim", role: "viewer", joinedAt: "2026-03-01" },
  ],
  namespaces: [
    { id: "ns_01", accountId: "acc_01", name: "payments", created: "2026-01-14", description: "Payment processing & reconciliation pipeline", queues: ["q_01","q_02","q_03"], serviceAccounts: ["sa_01","sa_02"] },
    { id: "ns_02", accountId: "acc_01", name: "notifications", created: "2026-02-03", description: "Email, SMS, and push notification delivery", queues: ["q_04","q_05"], serviceAccounts: ["sa_03"] },
    { id: "ns_03", accountId: "acc_01", name: "analytics", created: "2026-03-21", description: "Event stream for analytics and telemetry", queues: ["q_06"], serviceAccounts: ["sa_04","sa_05"] }
  ],
  queues: [
    { id: "q_01", namespace: "ns_01", name: "payment_events",  shardCount: 4, totalMessages: 14_920_331, publishRate: 2840, consumeRate: 2791, lag: 1204,   errorRate: 0.02, status: "healthy"  },
    { id: "q_02", namespace: "ns_01", name: "refund_queue",    shardCount: 2, totalMessages: 482_019,    publishRate: 41,   consumeRate: 39,   lag: 88,      errorRate: 0.00, status: "healthy"  },
    { id: "q_03", namespace: "ns_01", name: "reconciliation",  shardCount: 3, totalMessages: 2_190_442,  publishRate: 180,  consumeRate: 142,  lag: 24_018,  errorRate: 0.11, status: "degraded" },
    { id: "q_04", namespace: "ns_02", name: "email_queue",     shardCount: 6, totalMessages: 38_204_118, publishRate: 5120, consumeRate: 5103, lag: 720,     errorRate: 0.01, status: "healthy"  },
    { id: "q_05", namespace: "ns_02", name: "sms_queue",       shardCount: 2, totalMessages: 1_820_440,  publishRate: 220,  consumeRate: 218,  lag: 112,     errorRate: 0.00, status: "healthy"  },
    { id: "q_06", namespace: "ns_03", name: "event_stream",    shardCount: 8, totalMessages: 102_441_882,publishRate: 18400,consumeRate: 18220,lag: 44_212,  errorRate: 0.04, status: "healthy"  }
  ],
  shards: {
    q_01: [
      { id: 0, writeQps: 720,  readQps: 710,  lag: 204, lastOffset: 3_740_212, totalMessages: 3_740_212, activeSegment: "seg_1041", status: "active"   },
      { id: 1, writeQps: 690,  readQps: 682,  lag: 312, lastOffset: 3_680_019, totalMessages: 3_680_019, activeSegment: "seg_0987", status: "active"   },
      { id: 2, writeQps: 740,  readQps: 732,  lag: 388, lastOffset: 3_820_100, totalMessages: 3_820_100, activeSegment: "seg_1108", status: "active"   },
      { id: 3, writeQps: 690,  readQps: 667,  lag: 300, lastOffset: 3_680_000, totalMessages: 3_680_000, activeSegment: "seg_1002", status: "active"   }
    ],
    q_03: [
      { id: 0, writeQps: 60,   readQps: 44,   lag: 8204,  lastOffset: 820_140, totalMessages: 820_140, activeSegment: "seg_0420", status: "active"   },
      { id: 1, writeQps: 52,   readQps: 28,   lag: 9120,  lastOffset: 780_302, totalMessages: 780_302, activeSegment: "seg_0411", status: "degraded" },
      { id: 2, writeQps: 30,   readQps: 10,   lag: 6694,  lastOffset: 590_000, totalMessages: 590_000, activeSegment: "seg_0388", status: "active"   }
    ]
  },
  segments: {
    "q_01_0": [
      { id: "seg_1041", startOffset: 3_720_000, endOffset: 3_740_212, messageCount: 20_212,  sizeMb: 142,  status: "active", created: "2026-04-20 08:12", closed: null,            writeQps: 118, readQps: 112 },
      { id: "seg_1038", startOffset: 3_600_000, endOffset: 3_720_000, messageCount: 120_000, sizeMb: 820,  status: "closed", created: "2026-04-20 04:01", closed: "2026-04-20 08:12", writeQps: 0, readQps: 0 },
      { id: "seg_1020", startOffset: 3_400_000, endOffset: 3_600_000, messageCount: 200_000, sizeMb: 1300, status: "closed", created: "2026-04-19 19:40", closed: "2026-04-20 04:01", writeQps: 0, readQps: 0 },
      { id: "seg_0998", startOffset: 3_200_000, endOffset: 3_400_000, messageCount: 200_000, sizeMb: 1400, status: "closed", created: "2026-04-19 12:18", closed: "2026-04-19 19:40", writeQps: 0, readQps: 0 }
    ]
  },
  serviceAccounts: [
    { id: "sa_01", namespace: "ns_01", name: "payment-api",       keyPrefix: "pk_live_a7f9", created: "2026-01-14", permissions: [{ queue: "payment_events", perms: ["publish","subscribe"] },{ queue: "refund_queue", perms: ["publish"] }] },
    { id: "sa_02", namespace: "ns_01", name: "recon-worker",      keyPrefix: "pk_live_b3c2", created: "2026-01-18", permissions: [{ queue: "reconciliation", perms: ["subscribe","remove"] }] },
    { id: "sa_03", namespace: "ns_02", name: "notif-dispatcher",  keyPrefix: "pk_live_8d1e", created: "2026-02-03", permissions: [{ queue: "email_queue", perms: ["publish","subscribe"] },{ queue: "sms_queue", perms: ["publish","subscribe"] }] },
    { id: "sa_04", namespace: "ns_03", name: "analytics-ingest",  keyPrefix: "pk_live_2f44", created: "2026-03-21", permissions: [{ queue: "event_stream", perms: ["publish"] }] },
    { id: "sa_05", namespace: "ns_03", name: "analytics-reader",  keyPrefix: "pk_live_9a01", created: "2026-03-22", permissions: [{ queue: "event_stream", perms: ["subscribe"] }] }
  ],
  // ── DEBUG DATA ──────────────────────────────────────────────
  consumerGroups: [
    { id: "cg_01", name: "billing",        queue: "q_01", members: 3, lag: 500,    lastCommit: "2026-04-20 08:42:15", status: "active"  },
    { id: "cg_02", name: "analytics",      queue: "q_01", members: 2, lag: 204,    lastCommit: "2026-04-20 08:42:17", status: "active"  },
    { id: "cg_03", name: "audit-logger",   queue: "q_01", members: 1, lag: 0,      lastCommit: "2026-04-20 08:41:50", status: "idle"    },
    { id: "cg_04", name: "recon-worker",   queue: "q_03", members: 1, lag: 24018,  lastCommit: "2026-04-20 08:30:00", status: "lagging" },
    { id: "cg_05", name: "notif-consumer", queue: "q_04", members: 5, lag: 720,    lastCommit: "2026-04-20 08:42:16", status: "active"  }
  ],
  nodes: [
    { id: "node-1", status: "healthy",  shards: [0,1,2], region: "us-east-1a", load: 72, uptime: "14d 3h" },
    { id: "node-2", status: "healthy",  shards: [3,4,5], region: "us-east-1b", load: 65, uptime: "14d 3h" },
    { id: "node-3", status: "healthy",  shards: [6,7],   region: "us-east-1c", load: 58, uptime: "14d 3h" }
  ],
  resourceMetrics: { cpu: 80, memory: 70, disk: 90, diskIo: "HIGH" },
  networkMetrics:  { producerLatency: 20, consumerLatency: 80, packetLoss: 0.01 },
  producerStates: [
    { clientId: "service-A",   queue: "q_01", batchSize: 500, retryCount: 2, status: "active", rate: 1200 },
    { clientId: "service-B",   queue: "q_01", batchSize: 250, retryCount: 0, status: "active", rate: 640  },
    { clientId: "billing-svc", queue: "q_02", batchSize: 100, retryCount: 1, status: "active", rate: 41   }
  ],
  retryData: {
    q_01: {
      attempts: [
        { attempt: 1, timestamp: "08:41:55", error: "timeout",  msgId: "msg_fx7100" },
        { attempt: 2, timestamp: "08:42:05", error: "timeout",  msgId: "msg_fx7100" },
        { attempt: 3, timestamp: "08:42:15", error: null,        msgId: "msg_fx7100" }
      ],
      deadLettered: false, totalRetries: 12, retryRate: 0.4
    },
    q_03: {
      attempts: [
        { attempt: 1, timestamp: "08:30:10", error: "disk full",  msgId: "msg_rc2041" },
        { attempt: 2, timestamp: "08:30:40", error: "disk full",  msgId: "msg_rc2041" },
        { attempt: 3, timestamp: "08:31:10", error: "disk full",  msgId: "msg_rc2041" }
      ],
      deadLettered: true, totalRetries: 88, retryRate: 3.2
    }
  },
  integrityData: {
    q_01: { checksumValid: true,  offsetGap: false, lastChecked: "2026-04-20 08:42:00", duplicates: 0,  corrupted: 0 },
    q_03: { checksumValid: true,  offsetGap: false, lastChecked: "2026-04-20 08:40:00", duplicates: 0,  corrupted: 0 }
  },
  latencyBreakdown: {
    q_01: { produceToDisk: 5, diskToConsumer: 100, processing: 300, commit: 50 },
    q_03: { produceToDisk: 12, diskToConsumer: 380, processing: 1200, commit: 90 }
  },
  rebalanceEvents: [
    { id: "rb_01", event: "SHARD_MOVED", from: "node-1", to: "node-2", shard: 3, duration: 2000, timestamp: "2026-04-20 06:15:00" },
    { id: "rb_02", event: "SHARD_ADDED", from: null,     to: "node-3", shard: 7, duration: 1200, timestamp: "2026-04-19 14:30:00" },
    { id: "rb_03", event: "REBALANCE",   from: "node-2", to: "node-1", shard: 2, duration: 3100, timestamp: "2026-04-18 09:10:00" }
  ],
  configHistory: [
    { id: "ch_01", field: "retention_ms",    oldValue: "604800000 (7d)", newValue: "86400000 (1d)", changedBy: "aarav@acmecorp.io", timestamp: "2026-04-18 10:00:00" },
    { id: "ch_02", field: "segment_size_mb", oldValue: "256",            newValue: "512",            changedBy: "aarav@acmecorp.io", timestamp: "2026-04-15 14:00:00" }
  ],
  timeline: [
    { time: "10:00", event: "Segment created (seg_0420)",           type: "info"    },
    { time: "10:05", event: "Traffic spike detected (+340% write)",  type: "warning" },
    { time: "10:06", event: "Consumer lag increased to 24,018",      type: "warning" },
    { time: "10:07", event: "Disk reached 90% capacity on node-2",   type: "error"   },
    { time: "10:08", event: "2 write failures on shard-2 (disk full)",type: "error"   },
    { time: "10:10", event: "Segment rolled over → seg_0421",        type: "info"    },
    { time: "10:15", event: "Consumer group rebalanced (3 members)",  type: "info"    }
  ],
  messageTraces: [
    {
      traceId: "txn-123",
      shard: 2, segment: "seg-101", offset: 123456,
      producedAt: "2026-04-20 08:41:55.123", producedBy: "service-A",
      consumed: [
        { group: "billing",   processed: true,  committed: true,  processingTime: 320, processedAt: "2026-04-20 08:42:15.450" },
        { group: "analytics", processed: true,  committed: true,  processingTime: 85,  processedAt: "2026-04-20 08:41:58.200" }
      ]
    },
    {
      traceId: "txn-456",
      shard: 1, segment: "seg-100", offset: 122900,
      producedAt: "2026-04-20 08:40:01.001", producedBy: "billing-svc",
      consumed: [
        { group: "billing",   processed: false, committed: false, processingTime: 400, processedAt: null, error: "db timeout" }
      ]
    }
  ],
  offsets: {
    q_01: {
      earliest: 100000,
      latest: 3_740_212,
      committed: { "billing": 3_739_712, "analytics": 3_740_008, "audit-logger": 3_740_212 }
    },
    q_03: {
      earliest: 0,
      latest: 820_140,
      committed: { "recon-worker": 796_122 }
    }
  },
  errorLogs: [
    { id: "el_01", event: "WRITE_FAILED",            shard: 2, queue: "q_03", reason: "disk full",          timestamp: "2026-04-20 10:08:12" },
    { id: "el_02", event: "CONSUMER_TIMEOUT",        shard: 1, queue: "q_03", reason: "db timeout",         timestamp: "2026-04-20 10:07:45" },
    { id: "el_03", event: "SEGMENT_ROLLOVER_DELAYED",shard: 0, queue: "q_03", reason: "high write pressure", timestamp: "2026-04-20 10:06:30" },
    { id: "el_04", event: "RETRY_EXHAUSTED",         shard: 1, queue: "q_03", reason: "disk full (3 attempts)", timestamp: "2026-04-20 10:07:50" }
  ],
  config: { shardCount: 8, retentionMs: 86400000, segmentSizeMb: 512 }
};
