# Queue System Architecture Guide

## 1. Overview
This system is a distributed queue architecture designed for scalability, isolation, and performance.

Main components:
- Namespace
- Queue
- Shard
- Segment
- Service Account
- Permissions

---

## 2. Namespace
A namespace is a logical boundary (like a workspace or project).

Example:
- payments
- notifications
- analytics

Each namespace:
- Is isolated
- Contains its own queues
- Contains its own service accounts

---

## 3. Queue
Queues exist inside namespaces and store messages.

Example:
- email_queue
- sms_queue

Queues support:
- Publishing messages
- Subscribing to messages

---

## 4. Service Accounts & Permissions

Service accounts act like users or applications.

Permissions:
- Publish → send messages
- Subscribe → read messages
- Remove → delete messages

---

## 5. Shards
Queues are divided into shards for scaling.

Example:
Queue
├── Shard 0
├── Shard 1

Each shard:
- Handles part of the data
- Processes messages independently

---

## 6. Segments
Each shard contains segments.

Types:
- Active Segment → receives new messages
- Closed Segment → read-only

Each segment stores:
- Messages
- Offsets (position of messages)

---

## 7. Segment Lifecycle

1. Active Segment → writing messages
2. Close Segment → becomes read-only
3. Rollover → create new active segment

---

## 8. Shard Splitting

Used for scaling.

Before:
Shard 0

After:
Shard 0 (old)
Shard 1 (new)
Shard 2 (new)

New shards:
- Start from offset 0
- Have new segments

Old shard:
- Keeps existing data

---

## 9. Offsets

Offsets track message position.

- Local to each shard
- Reset for new shards after split

---

## 10. Example Flow

1. Create namespace
2. Create queue
3. Create service account
4. Assign permissions
5. Publish messages
6. Segment rollover
7. Split shard when load increases

---

## 11. Analogy

- Namespace → Building
- Queue → Conveyor belt
- Shard → Parallel belts
- Segment → Storage boxes
- Offset → Position index
- Service Account → Worker
- Permissions → Access rights

---

## 12. Summary

This system:
- Scales using shards
- Stores efficiently using segments
- Secures access via service accounts
- Tracks order using offsets
