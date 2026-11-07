-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "appStoreUrl" TEXT,
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY['web']::TEXT[],
ADD COLUMN     "playStoreUrl" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "appStoreUrl" TEXT,
ADD COLUMN     "platforms" TEXT[],
ADD COLUMN     "playStoreUrl" TEXT,
ALTER COLUMN "websiteUrl" DROP NOT NULL;
