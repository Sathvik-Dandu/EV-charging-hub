import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });

  async withLock<T>(key: string, work: () => Promise<T>, ttlMs = 5000): Promise<T> {
    const token = `${Date.now()}-${Math.random()}`;
    const acquired = await this.client.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');
    if (!acquired) throw new ConflictException('This charger is being booked by someone else, please retry');
    try {
      return await work();
    } finally {
      if ((await this.client.get(`lock:${key}`)) === token) await this.client.del(`lock:${key}`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
