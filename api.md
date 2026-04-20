# Queue Server — API & socket requirements

This document lists **control-plane HTTP-style operations**, **data-plane messaging**, and **real-time channels** implied by [queue_system_guide.md](./queue_system_guide.md) and [queue_manager_guide.md](./queue_manager_guide.md). Those guides describe **architecture and flows**, not a published OpenAPI spec; paths and methods below are **suggested contracts** that satisfy the described Queue Manager ↔ Queue Server split.

**Scope**

| Layer | Responsibility |
|--------|----------------|
| **Queue Manager** | Google SSO, sessions, accounts UI, orchestration |
| **Queue Server** | Namespaces, queues, shards, segments, service accounts, permissions, messages, offsets, metrics |

Users do not call the Queue Server directly for admin tasks; the Manager uses a **master token** (per queue_manager_guide §4).

---

## 1. Authentication

| Mechanism | Where | Notes |
|-----------|--------|--------|
| **Google OAuth 2.0** | Queue Manager only | End-user login; not the Queue Server’s primary auth for browsers. |
| **Master / service token** | Queue Manager → Queue Server | Required for privileged operations (e.g. namespace creation). Suggested header: `Authorization: Bearer <master_token>`. |
| **Service account credentials** | Clients → Queue Server | API keys or signed tokens for **publish / subscribe / remove** on permitted queues (queue_system_guide §4, queue_manager_guide §6–7). |

---

## 2. Control plane — namespaces

Derived from queue_manager_guide §4 and queue_system_guide §2.

| Operation | Purpose | Suggested inputs (from guides) |
|-----------|---------|--------------------------------|
| **Create namespace** | Isolated workspace for queues + service accounts | `namespace_name`, `public_key` |
| **List namespaces** | Manager account / scope view | (account or tenant id — implied by Manager, not spelled out in guides) |
| **Get namespace** | Detail / health | namespace id |
| **Update namespace** | Metadata (if supported) | Not in guides — optional |
| **Delete namespace** | Teardown | Not in guides — optional |

---

## 3. Control plane — queues

Derived from queue_manager_guide §5 and queue_system_guide §3, §5.

| Operation | Purpose | Suggested inputs (from guides) |
|-----------|---------|--------------------------------|
| **Create queue** | New queue with sharding | `queue_name`, `number_of_shards` |
| **List queues** | Per namespace | namespace id |
| **Get queue** | Configuration + summary | queue id |
| **Update queue** | Shard count / settings | Not explicit in guides — optional |
| **Delete queue** | Teardown | Not in guides — optional |

---

## 4. Control plane — shards & segment lifecycle

Derived from queue_system_guide §5–8 and queue_manager_guide §8 (shard view).

| Operation | Purpose | Notes |
|-----------|---------|--------|
| **List shards** | Queue view: shard id, offsets, throughput, lag, status | Aligns with “Queue View” fields |
| **Get shard** | Single shard detail | |
| **Split shard** | Scale-out: old shard keeps data; new shards start offset 0 | queue_system_guide §8 |
| **Trigger / observe segment rollover** | Active → closed → new active | queue_system_guide §7 (may be automatic server-side; Manager may only **observe** via metrics/API) |

**Shard / queue observability fields** (from queue_manager_guide §8 Queue View):

- Shard ID  
- Start offset, end offset (per shard or aggregate — guides imply per-shard offsets; queue_system_guide §9)  
- Total messages  
- Active segment  
- Throughput (write/read)  
- Lag  
- Status  

---

## 5. Control plane — segments

Derived from queue_system_guide §6–7 and queue_manager_guide §8 Shard View.

| Operation | Purpose | Suggested response fields (from guides) |
|-----------|---------|----------------------------------------|
| **List segments** (for shard) | Segment table | Segment ID, start offset, end offset, message count, size, status (active/closed), created time, closed time |
| **Get segment** | Drill-down | Same fields |

---

## 6. Control plane — service accounts & permissions

Derived from queue_system_guide §4 and queue_manager_guide §6–7.

| Operation | Purpose |
|-----------|---------|
| **Create service account** | New API client (e.g. `api-service`, `worker`) |
| **List service accounts** | Per namespace |
| **Get service account** | Keys, metadata |
| **Rotate / revoke credentials** | Security lifecycle (not in guides — recommended) |
| **Grant / update permissions** | Per queue: **publish**, **subscribe**, **remove** |
| **List permissions** | For a service account or queue |

---

## 7. Data plane — messaging (not necessarily REST)

queue_system_guide §3: queues support **publishing** and **subscribing**. These are often implemented as streaming RPC, WebSocket, or long-poll HTTP rather than a single REST call.

| Capability | Direction | Notes |
|------------|-----------|--------|
| **Publish** | Client → Server | Send messages to a queue (shard routing policy server-defined) |
| **Subscribe / consume** | Server → Client (stream) | Deliver messages; commit / ack model not specified in guides |
| **Remove / delete message** | Client → Server | Permission `remove` |

Exact wire protocol (gRPC, AMQP-like, custom TCP) is **not** defined in the two markdown guides.

---

## 8. Metrics & debugging APIs

Derived from queue_manager_guide §8–9. The Manager dashboard needs **pull** (HTTP) and often **push** (sockets) for live charts.

### 8.1 Queue metrics (HTTP or aggregated stream)

- Total messages  
- Publish rate  
- Consume rate  
- Lag  
- Error rate  

### 8.2 Shard metrics

- Load per shard  
- Lag per shard  
- Processing speed  

### 8.3 Segment metrics

- Size  
- Message density  
- Write speed  
- Read speed  

### 8.4 Debug / dump (explicit in app mock, not in the two guides)

The demo UI references a diagnostic endpoint shape:

- `GET /queues/{id}/debug-dump` — full debug snapshot for queue `id` (see `src/views/debug/DebugCenter.jsx`). Treat as **illustrative** until the real server documents it.

---

## 9. Real-time: WebSockets / SSE / streaming

The guides do not name WebSocket paths or event types. For a **pro-level** control plane matching §8–9, the Queue Server (or a metrics sidecar) typically exposes one or more of:

| Channel | Typical use | Events / topics (derived) |
|---------|-------------|----------------------------|
| **WebSocket** or **SSE** | Live queue metrics | Rates, lag, error rate per queue |
| **WebSocket** or **SSE** | Live shard metrics | Per-shard QPS, lag, status |
| **WebSocket** or **SSE** | Segment / storage signals | Rollover, split progress, disk pressure (if exposed) |
| **Dedicated subscribe socket** | Data plane | Consumer stream for messages (may be separate from admin metrics) |

Suggested subscription parameters (conceptual): `namespace`, `queue`, optional `shard`, optional `metric_granularity`.

---

## 10. Offset & ordering (API implications)

queue_system_guide §9:

- Offsets are **local per shard**  
- **New shards after split** reset offset semantics (new segments from 0)  

Implied APIs: expose **earliest / latest / committed** style offsets for debugging (queue_manager_debug flows in the broader app mention offset tracking; align any `GET .../offsets` with shard-local rules).

---

## 11. Summary checklist

**HTTP (or RPC mapped to HTTP) — control plane**

- [ ] Namespace: create (name, public_key), list, get  
- [ ] Queue: create (name, shard count), list, get  
- [ ] Shard: list, get, **split**  
- [ ] Segment: list/get per shard  
- [ ] Service account: CRUD + permission matrix (publish / subscribe / remove)  
- [ ] Metrics: queue, shard, segment endpoints **or** single aggregated debug dump  
- [ ] Auth: master token for Manager; service credentials for clients  

**Streaming / sockets**

- [ ] Optional: real-time metric streams for dashboard  
- [ ] Data plane: publish + subscribe (+ remove) — protocol TBD by actual server  

**Documented only in mock UI**

- [ ] `GET /queues/{id}/debug-dump` — confirm with real Queue Server spec  

---

## 12. Source documents

- [queue_system_guide.md](./queue_system_guide.md) — domain model, shards, segments, offsets, permissions  
- [queue_manager_guide.md](./queue_manager_guide.md) — Manager vs Server, SSO, namespace/queue/service account flows, UI metrics  

When the **actual** Queue Server exposes OpenAPI/gRPC protos, replace suggested paths with the official definitions and link them here.
