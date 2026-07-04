import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const c = await db.product.count();
  console.log("Product count:", c);
  const o = await db.order.count();
  console.log("Order count:", o);
}
main().then(() => db.$disconnect()).catch((e) => { console.error("ERR", e.message); process.exit(1); });
