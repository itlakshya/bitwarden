/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `department_users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `field_values` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,groupId]` on the table `field_definitions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,departmentId]` on the table `groups` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[verificationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'DEPARTMENT_ASSIGN', 'GROUP_ACCESS_GRANT', 'GROUP_ACCESS_REVOKE', 'DEPARTMENT_ACCESS_GRANT', 'DEPARTMENT_ACCESS_REVOKE', 'ITEM_CREATE', 'ITEM_UPDATE', 'ITEM_DELETE', 'EXPORT_DATA', 'IMPORT_DATA');

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_adminId_fkey";

-- AlterTable
ALTER TABLE "department_users" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "field_values" DROP COLUMN "updatedAt",
ALTER COLUMN "value" DROP NOT NULL;

-- AlterTable
ALTER TABLE "group_items" ADD COLUMN     "dynamicData" JSONB;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "department_users_userId_idx" ON "department_users"("userId");

-- CreateIndex
CREATE INDEX "department_users_departmentId_idx" ON "department_users"("departmentId");

-- CreateIndex
CREATE INDEX "department_users_createdAt_idx" ON "department_users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "departments_parentId_idx" ON "departments"("parentId");

-- CreateIndex
CREATE INDEX "departments_createdAt_idx" ON "departments"("createdAt");

-- CreateIndex
CREATE INDEX "field_definitions_groupId_idx" ON "field_definitions"("groupId");

-- CreateIndex
CREATE INDEX "field_definitions_order_idx" ON "field_definitions"("order");

-- CreateIndex
CREATE INDEX "field_definitions_type_idx" ON "field_definitions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_name_groupId_key" ON "field_definitions"("name", "groupId");

-- CreateIndex
CREATE INDEX "field_values_fieldDefinitionId_idx" ON "field_values"("fieldDefinitionId");

-- CreateIndex
CREATE INDEX "field_values_groupItemId_idx" ON "field_values"("groupItemId");

-- CreateIndex
CREATE INDEX "field_values_createdAt_idx" ON "field_values"("createdAt");

-- CreateIndex
CREATE INDEX "group_access_departmentUserId_idx" ON "group_access"("departmentUserId");

-- CreateIndex
CREATE INDEX "group_access_groupId_idx" ON "group_access"("groupId");

-- CreateIndex
CREATE INDEX "group_access_createdAt_idx" ON "group_access"("createdAt");

-- CreateIndex
CREATE INDEX "group_items_groupId_idx" ON "group_items"("groupId");

-- CreateIndex
CREATE INDEX "group_items_status_idx" ON "group_items"("status");

-- CreateIndex
CREATE INDEX "group_items_targetDate_idx" ON "group_items"("targetDate");

-- CreateIndex
CREATE INDEX "group_items_createdAt_idx" ON "group_items"("createdAt");

-- CreateIndex
CREATE INDEX "group_items_title_idx" ON "group_items"("title");

-- CreateIndex
CREATE INDEX "group_items_dynamicData_idx" ON "group_items" USING GIN ("dynamicData");

-- CreateIndex
CREATE INDEX "groups_departmentId_idx" ON "groups"("departmentId");

-- CreateIndex
CREATE INDEX "groups_name_idx" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_createdAt_idx" ON "groups"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_departmentId_key" ON "groups"("name", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_verificationToken_key" ON "users"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isVerified_idx" ON "users"("isVerified");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
