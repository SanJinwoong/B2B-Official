-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'ACTION_REQUIRED', 'REJECTED', 'APPROVED');

-- CreateTable
CREATE TABLE "SupplierApplication" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "website" TEXT,
    "category" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "monthlyCapacity" INTEGER NOT NULL,
    "capacityUnit" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "hasExportExp" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "certifications" TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "actionNote" TEXT,
    "actionToken" TEXT,
    "actionTokenExpiresAt" TIMESTAMP(3),
    "reviewerId" INTEGER,
    "reviewStartedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "captchaScore" DOUBLE PRECISION,
    "submittedFromIp" TEXT,
    "approvedUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "lastAccessedBy" INTEGER,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierApplication_actionToken_key" ON "SupplierApplication"("actionToken");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierApplication_approvedUserId_key" ON "SupplierApplication"("approvedUserId");

-- AddForeignKey
ALTER TABLE "SupplierApplication" ADD CONSTRAINT "SupplierApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierApplication" ADD CONSTRAINT "SupplierApplication_approvedUserId_fkey" FOREIGN KEY ("approvedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SupplierApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
