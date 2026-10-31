-- CreateTable
CREATE TABLE "HospitalPrescription" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientMrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "sex" TEXT,
    "birthDate" TEXT,
    "prescriberName" TEXT NOT NULL,
    "clinic" TEXT,
    "allergies" TEXT,
    "hmo" TEXT,
    "prescribedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalPrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "medicine" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "quantityUnit" TEXT,
    "quantityText" TEXT,
    "prescribedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "orderId" TEXT,
    "productId" TEXT,
    "supplyQuantity" INTEGER,
    "notSuppliedReason" TEXT,
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HospitalPrescription_visitId_key" ON "HospitalPrescription"("visitId");

-- CreateIndex
CREATE INDEX "HospitalPrescription_updatedAt_idx" ON "HospitalPrescription"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalPrescriptionItem_sourceId_key" ON "HospitalPrescriptionItem"("sourceId");

-- CreateIndex
CREATE INDEX "HospitalPrescriptionItem_prescriptionId_idx" ON "HospitalPrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "HospitalPrescriptionItem_orderId_idx" ON "HospitalPrescriptionItem"("orderId");

-- AddForeignKey
ALTER TABLE "HospitalPrescriptionItem" ADD CONSTRAINT "HospitalPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "HospitalPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescriptionItem" ADD CONSTRAINT "HospitalPrescriptionItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalPrescriptionItem" ADD CONSTRAINT "HospitalPrescriptionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
