-- CreateTable
CREATE TABLE "Doctor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chat_id" TEXT NOT NULL,
    "name" TEXT,
    "queue_id" TEXT,
    "queue_current" INTEGER,
    "doctor_id" TEXT,
    "status" TEXT
);

-- CreateTable
CREATE TABLE "CacheQueue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "queue_id" TEXT,
    "queue_current" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_name_key" ON "Doctor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_chat_id_key" ON "User"("chat_id");
