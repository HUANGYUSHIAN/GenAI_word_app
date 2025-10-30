-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "birthday" DATETIME,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "language" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paraGame" TEXT,
    "payments" TEXT,
    "lFriendIds" TEXT,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payments" TEXT,
    CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "permissions" TEXT,
    CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "website" TEXT,
    "lScores" TEXT,
    "lComments" TEXT,
    CONSTRAINT "Store_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER,
    "period" DATETIME,
    "link" TEXT,
    "text" TEXT,
    "picture" TEXT,
    CONSTRAINT "Coupon_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "langUse" TEXT,
    "langExp" TEXT,
    "copyrights" TEXT,
    "establisherUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vocabulary_establisherUserId_fkey" FOREIGN KEY ("establisherUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vocabularyId" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "spelling" TEXT,
    "explanation" TEXT,
    "partOfSpeech" TEXT,
    "sentences" TEXT,
    CONSTRAINT "Word_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_StudentCoupons" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_StudentCoupons_A_fkey" FOREIGN KEY ("A") REFERENCES "Coupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_StudentCoupons_B_fkey" FOREIGN KEY ("B") REFERENCES "Student" ("userId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_StudentCoupons_AB_unique" ON "_StudentCoupons"("A", "B");

-- CreateIndex
CREATE INDEX "_StudentCoupons_B_index" ON "_StudentCoupons"("B");
