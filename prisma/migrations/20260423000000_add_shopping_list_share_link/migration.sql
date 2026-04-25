-- CreateTable
CREATE TABLE "ShoppingListShareLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,
    "listName" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListShareLink_token_key" ON "ShoppingListShareLink"("token");

-- CreateIndex
CREATE INDEX "ShoppingListShareLink_userKey_listName_idx" ON "ShoppingListShareLink"("userKey", "listName");
