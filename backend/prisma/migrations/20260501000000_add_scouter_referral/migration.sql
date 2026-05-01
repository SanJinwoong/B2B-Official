-- Migration: add_scouter_referral
-- Adds Scouter, ScouterRating models and referral fields to User

-- 1. Create Scouter table
CREATE TABLE "Scouter" (
    "id"          SERIAL       PRIMARY KEY,
    "name"        TEXT         NOT NULL,
    "email"       TEXT,
    "phone"       TEXT,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "avgRating"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create ScouterRating table
CREATE TABLE "ScouterRating" (
    "id"           SERIAL       PRIMARY KEY,
    "scouterId"    INTEGER      NOT NULL,
    "stars"        INTEGER      NOT NULL,
    "comment"      TEXT,
    "clientUserId" INTEGER      NOT NULL UNIQUE,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add foreign key from ScouterRating to Scouter
ALTER TABLE "ScouterRating"
    ADD CONSTRAINT "ScouterRating_scouterId_fkey"
    FOREIGN KEY ("scouterId")
    REFERENCES "Scouter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Add referral columns to User
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "referredBy" TEXT,
    ADD COLUMN IF NOT EXISTS "scouterId"  INTEGER;

-- 5. Add foreign key from User to Scouter
ALTER TABLE "User"
    ADD CONSTRAINT "User_scouterId_fkey"
    FOREIGN KEY ("scouterId")
    REFERENCES "Scouter"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
