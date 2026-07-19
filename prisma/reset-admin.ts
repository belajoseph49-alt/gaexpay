import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const prisma = new PrismaClient();
  const hash = await hashPassword('Admin@2025');
  await prisma.user.update({
    where: { email: 'admin@gaexpay.com' },
    data: { passwordHash: hash }
  });
  console.log('Password reset successfully to Admin@2025');
}

main().catch(console.error);
