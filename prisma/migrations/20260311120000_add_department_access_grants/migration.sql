-- CreateTable
CREATE TABLE "department_access_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_access_grants_userId_departmentId_key" ON "department_access_grants"("userId", "departmentId");

-- CreateIndex
CREATE INDEX "department_access_grants_userId_idx" ON "department_access_grants"("userId");

-- CreateIndex
CREATE INDEX "department_access_grants_departmentId_idx" ON "department_access_grants"("departmentId");

-- AddForeignKey
ALTER TABLE "department_access_grants" ADD CONSTRAINT "department_access_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_access_grants" ADD CONSTRAINT "department_access_grants_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: If your database has the AuditAction enum (e.g. from audit_logs), add the new values manually once:
-- ALTER TYPE "AuditAction" ADD VALUE 'DEPARTMENT_ACCESS_GRANT';
-- ALTER TYPE "AuditAction" ADD VALUE 'DEPARTMENT_ACCESS_REVOKE';
