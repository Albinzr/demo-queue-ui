export function namespacesForAccount(state, accountId) {
  return state.namespaces.filter((n) => n.accountId === accountId);
}

export function queuesForNamespace(state, namespaceId) {
  return state.queues.filter((q) => q.namespace === namespaceId);
}

export function serviceAccountsForNamespace(state, namespaceId) {
  return state.serviceAccounts.filter((sa) => sa.namespace === namespaceId);
}

export function aggregateQueueMetrics(queues) {
  if (!queues.length) {
    return {
      totalMessages: 0,
      publishRate: 0,
      consumeRate: 0,
      lag: 0,
      errorRate: 0,
    };
  }
  const totalMessages = queues.reduce((s, q) => s + q.totalMessages, 0);
  const publishRate = queues.reduce((s, q) => s + q.publishRate, 0);
  const consumeRate = queues.reduce((s, q) => s + q.consumeRate, 0);
  const lag = queues.reduce((s, q) => s + q.lag, 0);
  const errorRate = queues.reduce((s, q) => s + q.errorRate, 0) / queues.length;
  return { totalMessages, publishRate, consumeRate, lag, errorRate };
}

export function segmentDensity(seg) {
  if (!seg.sizeMb) return 0;
  return Math.round(seg.messageCount / seg.sizeMb);
}

export function getShardList(state, queueId) {
  const existing = state.shards[queueId];
  if (existing?.length) return existing.map((s) => ({ ...s }));
  const q = state.queues.find((x) => x.id === queueId);
  if (!q) return [];
  const n = Math.max(1, q.shardCount || 1);
  const basePer = Math.max(1, Math.floor(q.totalMessages / n));
  return Array.from({ length: n }, (_, i) => {
    const isLast = i === n - 1;
    const totalMessages = isLast ? Math.max(0, q.totalMessages - basePer * (n - 1)) : basePer;
    const writeQps = Math.max(1, Math.round(q.publishRate / n));
    const readQps = Math.max(1, Math.round(q.consumeRate / n));
    const lag = Math.max(0, Math.round(q.lag / n));
    const lastOffset = (i + 1) * basePer;
    return {
      id: i,
      writeQps,
      readQps,
      lag,
      lastOffset,
      totalMessages,
      activeSegment: `seg_${queueId}_${i}`,
      status: q.status === "degraded" && i % 2 === 1 ? "degraded" : "active",
    };
  });
}

export function getSegmentsForShard(state, queueId, shardId) {
  const key = `${queueId}_${shardId}`;
  const pre = state.segments[key];
  if (pre?.length) return pre.map((s) => ({ ...s }));
  const shards = getShardList(state, queueId);
  const sh = shards.find((s) => s.id === shardId);
  if (!sh) return [];
  const end = sh.lastOffset || 0;
  const span = Math.max(1000, Math.floor((sh.totalMessages || 0) * 0.02));
  return [
    {
      id: sh.activeSegment || `seg_${queueId}_${shardId}`,
      startOffset: Math.max(0, end - span),
      endOffset: end,
      messageCount: Math.min(sh.totalMessages || 0, span),
      sizeMb: Math.max(8, Math.round((sh.totalMessages || 0) / 5000)),
      status: "active",
      created: "2026-04-20 08:00",
      closed: null,
      writeQps: sh.writeQps,
      readQps: sh.readQps,
    },
  ];
}

/** Deep copy segment rows for a shard (materialize synthetic rows into a mutable list). */
export function materializeSegmentsList(prev, queueId, shardId) {
  const key = `${queueId}_${shardId}`;
  const stored = prev.segments?.[key];
  if (stored?.length) return stored.map((s) => ({ ...s }));
  return getSegmentsForShard(prev, queueId, shardId).map((s) => ({ ...s }));
}

function segmentTimestamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function newSegmentId() {
  return `seg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Persist shard list with updated activeSegment for one shard (creates shards[queueId] if needed). */
function setShardActiveSegment(prev, queueId, shardId, activeSegmentId) {
  const shardList = getShardList(prev, queueId).map((s) =>
    s.id === shardId ? { ...s, activeSegment: activeSegmentId } : { ...s }
  );
  return { ...prev.shards, [queueId]: shardList };
}

/**
 * Repeatedly splits the same lineage shard until the queue reaches targetCount shards (mock).
 * Caps at maxShards. Stops if a split no longer increases shard count.
 */
export function splitShardToTargetCount(prev, queueId, fromShardId, targetCount, maxShards = 32) {
  let state = prev;
  const n = getShardList(state, queueId).length;
  const raw = Math.floor(Number(targetCount));
  if (!Number.isFinite(raw) || raw <= n) return prev;
  const target = Math.min(maxShards, raw);
  let guard = 0;
  while (getShardList(state, queueId).length < target && guard < 64) {
    guard += 1;
    const before = getShardList(state, queueId).length;
    state = splitShardState(state, queueId, fromShardId);
    const after = getShardList(state, queueId).length;
    if (after <= before) break;
  }
  return state;
}

/** Marks an active segment closed (mock). Persists segment list; updates shard active segment if needed. */
export function closeSegmentState(prev, queueId, shardId, segmentId) {
  const key = `${queueId}_${shardId}`;
  const list = materializeSegmentsList(prev, queueId, shardId);
  const ts = segmentTimestamp();
  let hit = false;
  const next = list.map((s) => {
    if (s.id !== segmentId || s.status !== "active") return { ...s };
    hit = true;
    return { ...s, status: "closed", closed: ts, writeQps: 0, readQps: 0 };
  });
  if (!hit) return prev;
  const nextActive = next.find((s) => s.status === "active");
  const shardList = getShardList(prev, queueId);
  const sh = shardList.find((s) => s.id === shardId);
  const activeSeg = nextActive?.id ?? "—";
  const shardsOut =
    sh && String(sh.activeSegment) === String(segmentId)
      ? setShardActiveSegment(prev, queueId, shardId, activeSeg)
      : prev.shards;
  return {
    ...prev,
    segments: { ...prev.segments, [key]: next },
    shards: shardsOut,
  };
}

/**
 * Closes an active segment and appends a new empty active segment (rollover).
 * If segmentId is null, rolls the first active segment in the list.
 */
export function rolloverSegmentState(prev, queueId, shardId, segmentId = null) {
  const key = `${queueId}_${shardId}`;
  const list = materializeSegmentsList(prev, queueId, shardId);
  const ts = segmentTimestamp();
  let idx = segmentId == null ? list.findIndex((s) => s.status === "active") : list.findIndex((s) => s.id === segmentId);
  if (idx < 0 || list[idx].status !== "active") return prev;
  const active = list[idx];
  const closed = {
    ...active,
    status: "closed",
    closed: ts,
    writeQps: 0,
    readQps: 0,
  };
  const endOff = active.endOffset ?? 0;
  const newId = newSegmentId();
  const newSeg = {
    id: newId,
    startOffset: endOff,
    endOffset: endOff,
    messageCount: 0,
    sizeMb: 0,
    status: "active",
    created: ts,
    closed: null,
    writeQps: active.writeQps,
    readQps: active.readQps,
  };
  const next = [...list.slice(0, idx), closed, newSeg, ...list.slice(idx + 1)];
  const shardsMap = setShardActiveSegment(prev, queueId, shardId, newId);
  return {
    ...prev,
    segments: { ...prev.segments, [key]: next },
    shards: shardsMap,
  };
}

export function splitShardState(prev, queueId, fromShardId) {
  const q = prev.queues.find((x) => x.id === queueId);
  if (!q) return prev;
  const base = getShardList(prev, queueId);
  const sid = Number(fromShardId);
  const idx = base.findIndex((s) => s.id === sid);
  if (idx < 0) return prev;
  const a = { ...base[idx] };
  const halfMsg = Math.floor(a.totalMessages / 2);
  if (halfMsg < 1 && a.totalMessages < 2) return prev;
  const remMsg = Math.max(1, a.totalMessages - halfMsg);
  const newId = Math.max(-1, ...base.map((x) => x.id)) + 1;
  const oldLast = a.lastOffset || 0;
  const shardA = {
    ...a,
    totalMessages: halfMsg,
    lastOffset: Math.max(0, oldLast - remMsg),
    writeQps: Math.max(1, Math.round(a.writeQps * 0.55)),
    readQps: Math.max(1, Math.round(a.readQps * 0.55)),
    lag: Math.max(0, Math.round(a.lag * 0.55)),
  };
  const shardB = {
    ...a,
    id: newId,
    totalMessages: remMsg,
    lastOffset: oldLast,
    activeSegment: `${String(a.activeSegment).replace(/_split.*$/, "")}_split`,
    writeQps: Math.max(1, Math.round(a.writeQps * 0.45)),
    readQps: Math.max(1, Math.round(a.readQps * 0.45)),
    lag: Math.max(0, Math.round(a.lag * 0.45)),
    status: a.status,
  };
  const shards = [...base.slice(0, idx), shardA, shardB, ...base.slice(idx + 1)];
  const queues = prev.queues.map((qu) =>
    qu.id === queueId ? { ...qu, shardCount: shards.length } : qu
  );
  return {
    ...prev,
    shards: { ...prev.shards, [queueId]: shards },
    queues,
  };
}

export const INITIAL_FLOW = {
  accountId: "acc_01",
  namespaceId: null,
  queueId: null,
  shardId: null,
  segmentId: null,
};
