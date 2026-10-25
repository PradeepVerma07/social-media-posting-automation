import { Response } from 'express';
import { logger } from '../logging/logger';

export interface SSEEvent {
  id: number;
  type: string;
  clientId: string;
  data: any;
  createdAt: string;
}

class SSEManager {
  private clients: Map<string, Set<{ res: Response; clientId: string }>> = new Map();
  private eventHistory: SSEEvent[] = [];
  private currentEventId = 0;
  private readonly MAX_HISTORY = 1000;

  constructor() {
    // Send 25-second keepalive heartbeat to prevent proxy timeout
    setInterval(() => {
      this.broadcastComment(': heartbeat\n\n');
    }, 25000);
  }

  addClient(clientId: string, res: Response, lastEventId?: number) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, new Set());
    }

    const clientObj = { res, clientId };
    this.clients.get(clientId)!.add(clientObj);

    // Initial headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`: connected to CI360 SSE Stream\n\n`);

    // Replay missed events if client reconnected with Last-Event-ID
    if (lastEventId !== undefined && !isNaN(lastEventId)) {
      const missed = this.eventHistory.filter(
        e => e.clientId === clientId && e.id > lastEventId
      );
      for (const ev of missed) {
        this.sendEventToResponse(res, ev);
      }
    }

    res.on('close', () => {
      this.clients.get(clientId)?.delete(clientObj);
    });
  }

  emit(type: string, clientId: string, data: any) {
    this.currentEventId++;
    const event: SSEEvent = {
      id: this.currentEventId,
      type,
      clientId,
      data,
      createdAt: new Date().toISOString(),
    };

    // Keep up to 1000 in memory
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    // Broadcast to connected clients for this tenant
    const targetClients = this.clients.get(clientId);
    if (targetClients && targetClients.size > 0) {
      for (const client of targetClients) {
        try {
          this.sendEventToResponse(client.res, event);
        } catch (err) {
          logger.warn({ clientId, err }, 'Failed delivering SSE event to client');
        }
      }
    }
  }

  private sendEventToResponse(res: Response, event: SSEEvent) {
    res.write(`id: ${event.id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }

  private broadcastComment(comment: string) {
    for (const [, set] of this.clients) {
      for (const client of set) {
        try {
          client.res.write(comment);
        } catch {
          // ignore dead client
        }
      }
    }
  }
}

export const sseManager = new SSEManager();
