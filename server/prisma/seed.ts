import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { dbConnectionOptions } from '../src/prisma/db-config';

const prisma = new PrismaClient({ adapter: new PrismaPg(dbConnectionOptions()) });

const DEMO_PASSWORD = 'Password@123';

const roles = [
  { name: 'ADMIN', description: 'Network Administrator - manages users, stations, chargers and tariffs' },
  { name: 'EV_OWNER', description: 'EV Owner - registers vehicles, books slots and pays invoices' },
  { name: 'STATION_OWNER', description: 'Station Owner - adds stations and chargers, runs on-site sessions at own stations' },
  { name: 'TECHNICIAN', description: 'Maintenance Technician - resolves charger faults' },
  { name: 'MANAGER', description: 'Operations Manager - reports, maintenance assignment and support enquiries' },
];

const accounts = [
  { fullName: 'Priya Nair', email: 'admin@evhub.com', phone: '9800000001', role: 'ADMIN' },
  { fullName: 'Rahul Sharma', email: 'owner@evhub.com', phone: '9800000002', role: 'EV_OWNER' },
  { fullName: 'Arjun Mehta', email: 'stationowner@evhub.com', phone: '9800000003', role: 'STATION_OWNER', organization: 'Mehta Charge Parks' },
  { fullName: 'Sanjay Kumar', email: 'tech@evhub.com', phone: '9800000004', role: 'TECHNICIAN' },
  { fullName: 'Vikram Rao', email: 'manager@evhub.com', phone: '9800000005', role: 'MANAGER' },
];

async function clearAll() {
  await prisma.auditLog.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.chargingSession.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.chargerStatusLog.deleteMany();
  await prisma.charger.deleteMany();
  await prisma.station.deleteMany();
  await prisma.tariff.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  await clearAll();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const role of roles) await prisma.role.create({ data: role });

  for (const { role, ...account } of accounts) {
    await prisma.user.create({
      data: { ...account, passwordHash, role: { connect: { name: role } } },
    });
  }

  console.log('Database cleaned. Created 5 roles and 5 accounts:');
  console.table(accounts.map(({ email, role }) => ({ email, role, password: DEMO_PASSWORD })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
