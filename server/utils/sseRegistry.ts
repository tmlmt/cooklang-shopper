type EventStream = ReturnType<typeof createEventStream>;
const connections = new Map<string, Set<EventStream>>();

export function registerStream(userKey: string, stream: EventStream): void {
  let streams = connections.get(userKey);
  if (!streams) {
    streams = new Set();
    connections.set(userKey, streams);
  }
  streams.add(stream);
}

export function unregisterStream(userKey: string, stream: EventStream): void {
  const streams = connections.get(userKey);
  if (!streams) return;
  streams.delete(stream);
  if (streams.size === 0) connections.delete(userKey);
}

export function getStreams(userKey: string): Set<EventStream> | undefined {
  return connections.get(userKey);
}
