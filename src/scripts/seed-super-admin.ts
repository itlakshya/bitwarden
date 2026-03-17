import { prisma } from '../lib/prisma'
import bcrypt from 'bcrypt'

async function createSuperAdmin() {
  try {
    // Only run in development environment
    if (process.env.NODE_ENV !== 'development') {
      console.log('Seed script can only run in development environment')
      console.log('Current NODE_ENV:', process.env.NODE_ENV)
      return
    }
    
    console.log('Creating Super Admin...')
    
    const superAdminEmail = 'admin@iiclakshya.com'
    const superAdminPassword = 'SuperAdmin@123'
    const superAdminName = 'Super Administrator'
    
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    })
    
    if (existingAdmin) {
      console.log('Super admin already exists!')
      console.log(`Email: ${existingAdmin.email}`)
      console.log(`Role: ${existingAdmin.role}`)
      return
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10)
    
    // Create super admin
    const superAdmin = await prisma.user.create({
      data: {
        name: superAdminName,
        email: superAdminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      }
    })
    
    console.log('Super Admin created successfully!')
    console.log('Login Details:')
    console.log(`   Email: ${superAdminEmail}`)
    console.log(`   Password: ${superAdminPassword}`)
    console.log(`   Role: ${superAdmin.role}`)
    console.log('')
    console.log('IMPORTANT: Please change the password after first login!')
    console.log('Admin Login URL: http://localhost:3000/admin/login')
    console.log('Regular Login URL: http://localhost:3000/auth/signin')
    
  } catch (error) {
    console.error('Error creating super admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()