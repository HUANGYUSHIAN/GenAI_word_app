import { prisma } from "../db/prisma";
import { hashPassword } from "../auth/hash";

export async function seedIfEmpty() {
  const userCount = await prisma.user.count();
  const vocabCount = await prisma.vocabulary.count();
  const couponCount = await prisma.coupon.count();

  if (userCount === 0) {
    const studentPwd = await hashPassword("Password123!");
    const supplierPwd = await hashPassword("Password123!");

    const student = await prisma.user.create({
      data: {
        email: "student@example.com",
        name: "Student Demo",
        passwordHash: studentPwd,
        role: "STUDENT",
        language: "zh-TW",
      },
    });
    await prisma.student.create({ data: { userId: student.id } });

    const supplier = await prisma.user.create({
      data: {
        email: "supplier@example.com",
        name: "Supplier Demo",
        passwordHash: supplierPwd,
        role: "SUPPLIER",
        language: "en",
      },
    });
    await prisma.supplier.create({ data: { userId: supplier.id } });
  }

  if (vocabCount === 0) {
    const establisher = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const establisherUserId = establisher ? establisher.id : (await prisma.user.findFirst()).id;
    await prisma.vocabulary.create({
      data: {
        name: "Demo Vocab",
        langUse: "en",
        langExp: "zh-TW",
        copyrights: "Demo",
        establisherUserId,
        words: {
          create: [
            { word: "apple", explanation: "蘋果", partOfSpeech: "noun" },
            { word: "run", explanation: "跑步", partOfSpeech: "verb" },
          ],
        },
      },
    });
  }

  if (couponCount === 0) {
    const sup = await prisma.supplier.findFirst();
    await prisma.coupon.create({
      data: {
        supplierId: sup ? sup.userId : null,
        period: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        link: "https://example.com/coupon",
        text: "10% OFF",
        picture: "",
      },
    });
  }
}



