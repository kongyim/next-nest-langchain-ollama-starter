import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

function loadEnvFile(): void {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env')];
  const filePath = candidates.find((candidate) => existsSync(candidate));
  if (!filePath) return;

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function bootstrap() {
  loadEnvFile();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: buildAllowedOrigins(),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(createRateLimitMiddleware());
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);
  await prisma.assertHealthy();
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

function buildAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  return configured
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function createRateLimitMiddleware() {
  type Bucket = { count: number; resetAt: number };
  const buckets = new Map<string, Bucket>();
  const policies = [
    { match: /^\/(auth\/login|auth\/register|admin\/login)$/, max: 12, windowMs: 60_000 },
    { match: /^\/chat\/stream$/, max: 80, windowMs: 60_000 },
    { match: /^\/admin(\/|$)/, max: 120, windowMs: 60_000 },
    { match: /.*/, max: 240, windowMs: 60_000 },
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path ?? '/';
    const policy = policies.find((candidate) => candidate.match.test(path)) ?? policies[policies.length - 1];
    const now = Date.now();
    const key = `${req.ip}:${policy.match.source}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > policy.max) {
      const retrySeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', retrySeconds.toString());
      res.status(429).json({
        message: 'Too many requests. Please retry shortly.',
      });
      return;
    }

    // Opportunistic cleanup to prevent unbounded growth.
    if (buckets.size > 5000) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}

void bootstrap();
