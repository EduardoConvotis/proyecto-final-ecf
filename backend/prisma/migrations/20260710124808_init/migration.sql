-- CreateEnum
CREATE TYPE "Role" AS ENUM ('tecnico', 'dispatcher', 'supervisor');

-- CreateEnum
CREATE TYPE "OrderState" AS ENUM ('Asignada', 'EnEjecucion', 'Enviada', 'Aprobada', 'Rechazada');

-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('ok', 'insufficient_evidence', 'provider_failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "state" "OrderState" NOT NULL DEFAULT 'Asignada',
    "assignedTechnicianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRecord" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "technicianNotes" TEXT,
    "location" TEXT NOT NULL,
    "signatureRef" TEXT NOT NULL,
    "workDurationMinutes" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidencePhoto" (
    "id" TEXT NOT NULL,
    "executionRecordId" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,

    CONSTRAINT "EvidencePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentSummary" (
    "id" TEXT NOT NULL,
    "executionRecordId" TEXT NOT NULL,
    "status" "SummaryStatus" NOT NULL,
    "summary" TEXT,
    "keyPoints" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "executionRecordId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reassignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "fromTechnicianId" TEXT NOT NULL,
    "toTechnicianId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reassignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentSummary_executionRecordId_key" ON "IncidentSummary"("executionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDecision_executionRecordId_key" ON "ReviewDecision"("executionRecordId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePhoto" ADD CONSTRAINT "EvidencePhoto_executionRecordId_fkey" FOREIGN KEY ("executionRecordId") REFERENCES "ExecutionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentSummary" ADD CONSTRAINT "IncidentSummary_executionRecordId_fkey" FOREIGN KEY ("executionRecordId") REFERENCES "ExecutionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_executionRecordId_fkey" FOREIGN KEY ("executionRecordId") REFERENCES "ExecutionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reassignment" ADD CONSTRAINT "Reassignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
