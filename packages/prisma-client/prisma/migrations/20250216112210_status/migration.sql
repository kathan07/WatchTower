/*
  Warnings:

  - The values [PENDING,FAILED,ACKNOWLEDGED] on the enum `AlertStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AlertStatus_new" AS ENUM ('SENT');
ALTER TABLE "Alert" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Alert" ALTER COLUMN "status" TYPE "AlertStatus_new" USING ("status"::text::"AlertStatus_new");
ALTER TYPE "AlertStatus" RENAME TO "AlertStatus_old";
ALTER TYPE "AlertStatus_new" RENAME TO "AlertStatus";
DROP TYPE "AlertStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "status" DROP DEFAULT;
