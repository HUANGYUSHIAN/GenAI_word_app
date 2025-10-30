/*
  Warnings:

  - You are about to drop the column `sentences` on the `Word` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vocabularyId" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "spelling" TEXT,
    "explanation" TEXT,
    "partOfSpeech" TEXT,
    "sentence" TEXT,
    CONSTRAINT "Word_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Word" ("explanation", "id", "partOfSpeech", "spelling", "vocabularyId", "word") SELECT "explanation", "id", "partOfSpeech", "spelling", "vocabularyId", "word" FROM "Word";
DROP TABLE "Word";
ALTER TABLE "new_Word" RENAME TO "Word";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
