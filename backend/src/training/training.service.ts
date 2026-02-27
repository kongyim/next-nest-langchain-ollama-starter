import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

export type TrainingStatus = 'idle' | 'trained';
export type TrainingJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface TrainingEntry {
  id: string;
  title: string;
  content: string;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  lastTrainedAt: string | null;
}

export interface TrainingRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: 'completed';
  processedEntries: number;
}

export interface TrainingJob {
  id: string;
  entryId: string | null;
  status: TrainingJobStatus;
  progress: number;
  processedEntries: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

interface TrainingStore {
  entries: TrainingEntry[];
  runs: TrainingRun[];
  jobs: TrainingJob[];
}

@Injectable()
export class TrainingService {
  private readonly filePath = resolve(process.cwd(), 'data', 'training-store.json');
  private isQueueRunning = false;

  listEntries(): TrainingEntry[] {
    return this.readStore().entries;
  }

  listRuns(): TrainingRun[] {
    return this.readStore().runs;
  }

  listJobs(): TrainingJob[] {
    return this.readStore().jobs;
  }

  createEntry(title: string, content: string): TrainingEntry {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      throw new BadRequestException('Title is required.');
    }

    if (cleanContent.length < 20) {
      throw new BadRequestException('Content must be at least 20 characters.');
    }

    const store = this.readStore();
    const now = new Date().toISOString();

    const entry: TrainingEntry = {
      id: randomUUID(),
      title: cleanTitle,
      content: cleanContent,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      lastTrainedAt: null,
    };

    store.entries.unshift(entry);
    this.writeStore(store);
    return entry;
  }

  createEntryFromFile(fileName: string, mimeType: string | undefined, buffer: Buffer): TrainingEntry {
    const lower = fileName.toLowerCase();
    const supportedExtensions = ['.txt', '.md', '.csv', '.json'];
    const isSupported = supportedExtensions.some((ext) => lower.endsWith(ext));

    if (!isSupported) {
      throw new BadRequestException('Unsupported file type. Use .txt, .md, .csv, or .json.');
    }

    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max size is 2MB.');
    }

    const content = buffer.toString('utf8').trim();
    if (content.length < 20) {
      throw new BadRequestException('File content must be at least 20 characters.');
    }

    const title = `${fileName}${mimeType ? ` (${mimeType})` : ''}`;
    return this.createEntry(title, content);
  }

  deleteEntry(entryId: string): { ok: true } {
    const store = this.readStore();
    store.entries = store.entries.filter((entry) => entry.id !== entryId);
    this.writeStore(store);
    return { ok: true };
  }

  enqueueTraining(entryId?: string): TrainingJob {
    const store = this.readStore();
    const targets = entryId
      ? store.entries.filter((entry) => entry.id === entryId)
      : store.entries;

    if (targets.length === 0) {
      throw new BadRequestException('No training entries found.');
    }

    const now = new Date().toISOString();
    const job: TrainingJob = {
      id: randomUUID(),
      entryId: entryId ?? null,
      status: 'queued',
      progress: 0,
      processedEntries: targets.length,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      error: null,
    };

    store.jobs.unshift(job);
    this.writeStore(store);

    void this.processQueue();
    return job;
  }

  eval(query: string, limit = 3) {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('Query is required.');
    }

    const tokens = cleanQuery
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length >= 2);

    const entries = this.readStore().entries;
    const scored = entries
      .map((entry) => {
        const haystack = `${entry.title}\n${entry.content}`.toLowerCase();
        let score = 0;
        for (const token of tokens) {
          if (haystack.includes(token)) {
            score += 1;
          }
        }

        return {
          entry,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(10, limit)));

    if (scored.length === 0) {
      return {
        answer: 'No relevant training data found for this query.',
        sources: [],
      };
    }

    const sources = scored.map((item) => ({
      id: item.entry.id,
      title: item.entry.title,
      score: item.score,
      snippet: this.snippet(item.entry.content),
    }));

    const answer = sources
      .map((source, index) => `${index + 1}. ${source.title}: ${source.snippet}`)
      .join('\n');

    return {
      answer,
      sources,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isQueueRunning) return;
    this.isQueueRunning = true;

    try {
      while (true) {
        const store = this.readStore();
        const nextJob = store.jobs.find((job) => job.status === 'queued');
        if (!nextJob) break;

        const startedAt = new Date().toISOString();
        nextJob.status = 'running';
        nextJob.startedAt = startedAt;
        nextJob.progress = 5;
        this.writeStore(store);

        try {
          await this.sleep(300);

          const activeStore = this.readStore();
          const activeJob = activeStore.jobs.find((job) => job.id === nextJob.id);
          if (!activeJob) continue;

          const targets = activeJob.entryId
            ? activeStore.entries.filter((entry) => entry.id === activeJob.entryId)
            : activeStore.entries;

          if (targets.length === 0) {
            activeJob.status = 'failed';
            activeJob.error = 'No training entries found for this job.';
            activeJob.finishedAt = new Date().toISOString();
            activeJob.progress = 100;
            this.writeStore(activeStore);
            continue;
          }

          const now = new Date().toISOString();
          const step = Math.max(1, Math.floor(80 / targets.length));

          for (const entry of targets) {
            entry.status = 'trained';
            entry.lastTrainedAt = now;
            entry.updatedAt = now;
            activeJob.progress = Math.min(95, activeJob.progress + step);
            this.writeStore(activeStore);
            await this.sleep(200);
          }

          const finishedAt = new Date().toISOString();
          activeJob.status = 'completed';
          activeJob.progress = 100;
          activeJob.finishedAt = finishedAt;

          activeStore.runs.unshift({
            id: randomUUID(),
            startedAt: activeJob.startedAt ?? startedAt,
            finishedAt,
            status: 'completed',
            processedEntries: targets.length,
          });

          this.writeStore(activeStore);
        } catch (error) {
          const failedStore = this.readStore();
          const failedJob = failedStore.jobs.find((job) => job.id === nextJob.id);
          if (failedJob) {
            failedJob.status = 'failed';
            failedJob.error = error instanceof Error ? error.message : 'Unknown training error';
            failedJob.finishedAt = new Date().toISOString();
            failedJob.progress = 100;
            this.writeStore(failedStore);
          }
        }
      }
    } finally {
      this.isQueueRunning = false;
    }
  }

  private readStore(): TrainingStore {
    this.ensureStoreFile();
    const raw = readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TrainingStore>;

    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  }

  private writeStore(store: TrainingStore): void {
    this.ensureStoreFile();
    writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf8');
  }

  private ensureStoreFile(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (!existsSync(this.filePath)) {
      writeFileSync(this.filePath, JSON.stringify({ entries: [], runs: [], jobs: [] }, null, 2), 'utf8');
    }
  }

  private snippet(content: string, maxLength = 180): string {
    const clean = content.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength)}...`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
  }
}
