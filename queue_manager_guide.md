# Queue Manager Architecture Guide

## 1. Overview
Queue Manager is a control plane built on top of the Queue Server.

It handles:
- Authentication (Google SSO)
- Resource Management (accounts, namespaces, queues)
- Debugging and observability

Queue Server = Engine  
Queue Manager = Control Panel

---

## 2. Authentication (Google SSO)

Users log in using Google OAuth 2.0.

Flow:
1. User clicks login
2. Google verifies identity
3. Queue Manager creates session

---

## 3. Account System

Each user belongs to an account.

Example:
- Acme Corp
- StartupX

Each account owns:
- Namespaces
- Queues
- Service Accounts

---

## 4. Namespace Creation

Input:
- namespace_name
- public_key

Queue Manager calls Queue Server using master token.

Users never directly access Queue Server.

---

## 5. Queue Creation

Inside namespace:
Input:
- queue_name
- number_of_shards

Queue is split into shards.

---

## 6. Service Accounts

Service accounts act like API clients.

Example:
- api-service
- worker

---

## 7. Permissions

Each service account can access multiple queues.

Permissions:
- Publish
- Subscribe
- Remove

---

## 8. Debugging System

### Queue View
Displays shards with:
- Shard ID
- Start offset
- End offset
- Total messages
- Active segment
- Throughput
- Lag
- Status

---

### Shard View
Displays segments with:
- Segment ID
- Start offset
- End offset
- Message count
- Size
- Status
- Created time
- Closed time

---

## 9. Metrics

### Queue Metrics
- Total messages
- Publish rate
- Consume rate
- Lag
- Error rate

### Shard Metrics
- Load per shard
- Lag per shard
- Processing speed

### Segment Metrics
- Size
- Message density
- Write speed
- Read speed

---

## 10. Debugging Use Cases

Why queue slow?
- Check lag
- Check shard imbalance

Why messages not consumed?
- No subscriber
- Permission issue

Why storage high?
- Too many segments
- No cleanup

---

## 11. UI Structure

Sidebar:
- Accounts
- Namespaces
- Queues
- Service Accounts

Main views:
- Namespace View
- Queue View
- Shard View
- Service Account View

---

## 12. Flow

1. Login via Google
2. Create account
3. Create namespace
4. Create queue
5. Create service accounts
6. Assign permissions
7. Debug using dashboard

---

## 13. Summary

Queue Manager:
- Controls access
- Manages resources
- Provides debugging

Queue Server:
- Handles data
- Handles performance

This creates a scalable and secure queue platform.
