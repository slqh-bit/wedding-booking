-- CreateTable
CREATE TABLE "CategoryConfig" (
    "id" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "dateLimited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryConfig_category_key" ON "CategoryConfig"("category");

