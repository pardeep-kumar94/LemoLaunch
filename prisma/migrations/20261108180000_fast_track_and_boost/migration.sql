-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "launchAt" TIMESTAMP(3),
ADD COLUMN     "pinnedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "launchAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Boost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'awaiting',
    "checkoutSessionId" TEXT,
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Boost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Boost_startDate_endDate_idx" ON "Boost"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Boost_productId_idx" ON "Boost"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_launchAt_key" ON "Product"("launchAt");

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

