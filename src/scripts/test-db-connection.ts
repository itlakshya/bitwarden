import { prisma } from '../lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('Database connection successful!')
    
    // Check if tables exist by querying user count
    const userCount = await prisma.user.count()
    console.log(`Current users in database: ${userCount}`)
    
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
    
    console.log('Database tables created:')
    console.table(tables)
    
  } catch (error) {
    console.error('Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
    
    // Clean up test file
    try {
      const testFilePath = join(__dirname, 'test-db-connection.ts')
      await unlink(testFilePath)
      console.log('\nTest file cleaned up automatically')
    } catch (cleanupError) {
      console.log('Note: Test file cleanup skipped (file may be in use)')
    }
  }
}

testConnection()