-- CreateEnum
CREATE TYPE "SharePreference" AS ENUM ('PRIVATE', 'ANONYMOUS', 'NAMED');

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "sharePreference" "SharePreference" NOT NULL DEFAULT 'PRIVATE';
