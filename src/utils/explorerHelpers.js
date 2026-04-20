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
