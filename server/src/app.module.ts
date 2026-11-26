import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CommonModule } from './common/common.module';
import { AuthGuard } from './common/auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { StationsModule } from './stations/stations.module';
import { ChargersModule } from './chargers/chargers.module';
import { BookingsModule } from './bookings/bookings.module';
import { SessionsModule } from './sessions/sessions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OverviewModule } from './overview/overview.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
    }),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    StationsModule,
    ChargersModule,
    BookingsModule,
    SessionsModule,
    InvoicesModule,
    MaintenanceModule,
    OverviewModule,
    EnquiriesModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
