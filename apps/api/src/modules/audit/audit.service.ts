import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction, AuditTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditLogInput = {
  actorId?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Prisma.JsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? undefined,
      },
    });
  }
}
