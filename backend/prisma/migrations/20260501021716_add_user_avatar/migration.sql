-- AlterTable
ALTER TABLE "Scouter" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT;
