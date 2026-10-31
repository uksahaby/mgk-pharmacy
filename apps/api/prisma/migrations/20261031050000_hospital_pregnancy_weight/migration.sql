-- AlterTable
ALTER TABLE "HospitalPrescription" ADD COLUMN     "pregnancyBasis" TEXT,
ADD COLUMN     "pregnancyRecordedAt" TIMESTAMP(3),
ADD COLUMN     "pregnancyStatus" TEXT,
ADD COLUMN     "pregnancyWeeks" INTEGER,
ADD COLUMN     "weightKg" DOUBLE PRECISION,
ADD COLUMN     "weightRecordedAt" TIMESTAMP(3);

