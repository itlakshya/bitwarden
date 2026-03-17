import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { auditUserAction } from "@/lib/audit";
import { hasDepartmentAccess, isDepartmentUnderAdmin } from "@/lib/department-access";
import { AuditAction } from "@prisma/client";

// GET - Get all items for a group (JSON)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId } = await params;
    
    // Get group with access check
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        department: true,
        fieldDefinitions: {
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    const hasAccess = await checkGroupAccess(session.user.id, groupId, session.user.role, session.user.departmentId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }
    
    // Get items with field values
    const items = await prisma.groupItem.findMany({
      where: { groupId },
      include: {
        values: {
          include: {
            fieldDefinition: {
              select: {
                id: true,
                name: true,
                type: true,
                encrypted: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Decrypt encrypted values
    const decryptedItems = items.map(item => ({
      ...item,
      values: item.values.map(value => ({
        ...value,
        value: value.fieldDefinition.encrypted && value.encryptedValue 
          ? decrypt(value.encryptedValue) 
          : value.value
      }))
    }));
    
    return NextResponse.json({ 
      items: decryptedItems,
      group: {
        id: group.id,
        name: group.name,
        fieldDefinitions: group.fieldDefinitions
      }
    });
  } catch (error: any) {
    console.error('Error fetching group items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group items' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// GET /export - Export group items as CSV
export async function GET_EXPORT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        department: true,
        fieldDefinitions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const hasAccess = await checkGroupAccess(
      session.user.id,
      groupId,
      session.user.role,
      session.user.departmentId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this group" },
        { status: 403 }
      );
    }

    const items = await prisma.groupItem.findMany({
      where: { groupId },
      include: {
        values: {
          include: {
            fieldDefinition: {
              select: {
                id: true,
                name: true,
                type: true,
                encrypted: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const decryptedItems = items.map((item) => ({
      ...item,
      values: item.values.map((value) => ({
        ...value,
        value:
          value.fieldDefinition.encrypted && value.encryptedValue
            ? decrypt(value.encryptedValue)
            : value.value,
      })),
    }));

    const headers = ["Title", "Created At", ...group.fieldDefinitions.map((f) => f.name)];

    const escapeCsv = (value: string | null | undefined) => {
      if (value === null || value === undefined) return "";
      const s = String(value);
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [
      headers.map(escapeCsv).join(","),
      ...decryptedItems.map((item) => {
        const base = [
          escapeCsv(item.title),
          escapeCsv(item.createdAt.toISOString()),
        ];

        const fieldValues = group.fieldDefinitions.map((field) => {
          const v = item.values.find(
            (val) => val.fieldDefinition.id === field.id
          );
          return escapeCsv(v?.value ?? "");
        });

        return [...base, ...fieldValues].join(",");
      }),
    ];

    const csv = lines.join("\n");

    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${group.name || "group"}-items.csv"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error("Error exporting group items CSV:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export group items" },
      { status: error.message?.includes("required") ? 403 : 500 }
    );
  }
}

// POST - Create new group item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: groupId } = await params;
    const body = await request.json();
    const { title, fieldValues, values, targetDate, status = 'ACTIVE' } = body;
    
    // Handle both old format (values array) and new format (fieldValues object)
    const fieldValuesData = fieldValues || values;
    
    // Validation
    if (!title) {
      return NextResponse.json(
        { error: 'Item title is required' },
        { status: 400 }
      );
    }
    
    // Get group with field definitions
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        fieldDefinitions: true
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    // Check access permissions
    const hasAccess = await checkGroupAccess(session.user.id, groupId, session.user.role, session.user.departmentId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this group' },
        { status: 403 }
      );
    }
    
    // Validate required fields
    const requiredFields = group.fieldDefinitions.filter(field => field.required);
    for (const field of requiredFields) {
      let fieldValue;
      
      if (Array.isArray(fieldValuesData)) {
        // Old format: array of objects with fieldDefinitionId
        fieldValue = fieldValuesData.find((v: any) => v.fieldDefinitionId === field.id);
        if (!fieldValue || !fieldValue.value) {
          return NextResponse.json(
            { error: `Field '${field.name}' is required` },
            { status: 400 }
          );
        }
      } else if (fieldValuesData && typeof fieldValuesData === 'object') {
        // New format: object with field IDs/names as keys
        const value = fieldValuesData[field.id] || fieldValuesData[field.name];
        if (!value || value.trim() === '') {
          return NextResponse.json(
            { error: `Field '${field.name}' is required` },
            { status: 400 }
          );
        }
      }
    }
    
    // Create item with field values in a transaction
    const item = await prisma.$transaction(async (tx) => {
      // Prepare JSONB data for non-encrypted fields
      let dynamicData: Record<string, any> = {};
      if (fieldValuesData && !Array.isArray(fieldValuesData)) {
        // For new format, store non-encrypted fields in JSONB
        Object.entries(fieldValuesData).forEach(([key, value]) => {
          const fieldDef = group.fieldDefinitions.find(f => f.id === key || f.name === key);
          if (fieldDef && !fieldDef.encrypted && value) {
            dynamicData[fieldDef.name] = value;
          }
        });
      }
      
      // Create the item
      const newItem = await tx.groupItem.create({
        data: {
          title,
          groupId,
          targetDate: targetDate ? new Date(targetDate) : null,
          status,
          dynamicData: Object.keys(dynamicData).length > 0 ? dynamicData : undefined,
        }
      });
      
      // Create field values
      if (fieldValuesData) {
        let valuesToProcess = [];
        
        if (Array.isArray(fieldValuesData)) {
          // Old format: array of objects
          valuesToProcess = fieldValuesData;
        } else {
          // New format: object with field IDs/names as keys
          valuesToProcess = Object.entries(fieldValuesData).map(([key, value]) => {
            // Find field definition by ID or name
            const fieldDef = group.fieldDefinitions.find(f => f.id === key || f.name === key);
            return {
              fieldDefinitionId: fieldDef?.id || key,
              value: value
            };
          });
        }
        
        const fieldValues = await Promise.all(
          valuesToProcess.map(async (value: any) => {
            const fieldDef = group.fieldDefinitions.find(f => f.id === value.fieldDefinitionId);
            
            if (!fieldDef) {
              throw new Error(`Invalid field definition ID: ${value.fieldDefinitionId}`);
            }
            
            let storedValue = value.value;
            let encryptedValue = null;
            
            // Encrypt sensitive fields
            if (fieldDef.encrypted && value.value) {
              encryptedValue = encrypt(value.value);
              storedValue = ''; // Don't store plain text for encrypted fields
            }
            
            return {
              fieldDefinitionId: value.fieldDefinitionId,
              groupItemId: newItem.id,
              value: storedValue,
              encryptedValue
            };
          })
        );
        
        await tx.fieldValue.createMany({
          data: fieldValues
        });
      }
      
      // Return item with values
      return await tx.groupItem.findUnique({
        where: { id: newItem.id },
        include: {
          values: {
            include: {
              fieldDefinition: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  encrypted: true
                }
              }
            }
          }
        }
      });
    });
    
    if (session?.user) {
      auditUserAction(
        AuditAction.ITEM_CREATE,
        session.user.id,
        session.user.email!,
        session.user.role,
        'GroupItem',
        item!.id,
        item!.title,
        { groupId },
        request
      );
    }
    
    // Decrypt values for response
    const decryptedItem = {
      ...item,
      values: item!.values.map(value => ({
        ...value,
        value: value.fieldDefinition.encrypted && value.encryptedValue 
          ? decrypt(value.encryptedValue) 
          : value.value
      }))
    };
    
    return NextResponse.json({ 
      message: 'Item created successfully',
      item: decryptedItem 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating group item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create group item' },
      { status: error.message?.includes('required') ? 403 : 500 }
    );
  }
}

// Helper function to check group access
async function checkGroupAccess(
  userId: string, 
  groupId: string, 
  userRole: string, 
  userDepartmentId?: string | null
): Promise<boolean> {
  // Super admin has access to everything
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Get group department
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { departmentId: true }
  });
  
  if (!group) {
    return false;
  }
  
  // Department admin can access groups in their department and all sub-departments
  if (userRole === 'DEPT_ADMIN' && userDepartmentId && await isDepartmentUnderAdmin(group.departmentId, userDepartmentId)) {
    return true;
  }

  // Supervisor can access groups in the sub-department they supervise
  if (userRole === 'SUPERVISOR' && userDepartmentId === group.departmentId) {
    return true;
  }

  // Granted department access (branch or sub-branch) allows group access
  if (await hasDepartmentAccess(userId, group.departmentId)) {
    return true;
  }
  
  // Regular users need explicit group access
  const groupAccess = await prisma.groupAccess.findFirst({
    where: {
      groupId,
      departmentUser: {
        userId
      }
    }
  });
  
  return !!groupAccess;
}