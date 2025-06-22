const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.warn_type.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 1,
        name: "ap",
        description: "Activity Points related warning",
      },
      {
        id: 2,
        name: "donation",
        description: "Donation related warning",
      },
    ],
  });

  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      app_open: true,
      send_wlc_msg: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
