import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testMultiTenancy() {
  console.log('🧪 Testing Multi-Tenant Database Operations...')
  
  try {
    // Test 1: Create Organizations (Tenants)
    console.log('\n1. Creating test organizations...')
    
    const org1 = await prisma.organization.create({
      data: {
        name: 'Test Org 1',
        plan: 'STARTER',
        domain: 'test1.example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    const org2 = await prisma.organization.create({
      data: {
        name: 'Test Org 2', 
        plan: 'PRO',
        domain: 'test2.example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created organizations: ${org1.id}, ${org2.id}`)
    
    // Test 2: Create Users for each organization
    console.log('\n2. Creating users...')
    
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@test1.example.com',
        name: 'User One',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    const user2 = await prisma.user.create({
      data: {
        email: 'user2@test2.example.com',
        name: 'User Two', 
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created users: ${user1.id}, ${user2.id}`)
    
    // Test 3: Add users to their respective organizations
    console.log('\n3. Adding users to organizations...')
    
    await prisma.organizationMember.create({
      data: {
        organizationId: org1.id,
        userId: user1.id,
        role: 'ADMIN',
        joinedAt: new Date()
      }
    })
    
    await prisma.organizationMember.create({
      data: {
        organizationId: org2.id,
        userId: user2.id,
        role: 'MEMBER',
        joinedAt: new Date()
      }
    })
    
    console.log('✅ Users added to organizations')
    
    // Test 4: Create organization-scoped projects
    console.log('\n4. Creating organization-scoped projects...')
    
    const project1 = await prisma.project.create({
      data: {
        name: 'Org 1 Project',
        organizationId: org1.id,
        ownerId: user1.id,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    const project2 = await prisma.project.create({
      data: {
        name: 'Org 2 Project',
        organizationId: org2.id,
        ownerId: user2.id,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created projects: ${project1.id}, ${project2.id}`)
    
    // Test 5: Test tenant isolation - each org should only see their own data
    console.log('\n5. Testing tenant isolation...')
    
    const org1Projects = await prisma.project.findMany({
      where: { organizationId: org1.id }
    })
    
    const org2Projects = await prisma.project.findMany({
      where: { organizationId: org2.id }
    })
    
    console.log(`✅ Org 1 sees ${org1Projects.length} project(s)`)
    console.log(`✅ Org 2 sees ${org2Projects.length} project(s)`)
    
    if (org1Projects.length === 1 && org2Projects.length === 1) {
      console.log('✅ Tenant isolation working correctly!')
    } else {
      throw new Error('❌ Tenant isolation failed!')
    }
    
    // Test 6: Test audit logging
    console.log('\n6. Testing audit logging...')
    
    await prisma.auditLog.create({
      data: {
        organizationId: org1.id,
        userId: user1.id,
        action: 'CREATE',
        resourceType: 'project',
        resourceId: project1.id,
        details: { projectName: 'Org 1 Project' },
        timestamp: new Date()
      }
    })
    
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: org1.id }
    })
    
    console.log(`✅ Created ${auditLogs.length} audit log(s)`)
    
    // Test 7: Test subscription management
    console.log('\n7. Testing subscription management...')
    
    await prisma.subscription.create({
      data: {
        organizationId: org1.id,
        stripeCustomerId: 'cus_test1',
        stripeSubscriptionId: 'sub_test1',
        stripePriceId: 'price_starter_monthly',
        plan: 'STARTER',
        billingPeriod: 'MONTHLY',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false
      }
    })
    
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: org1.id }
    })
    
    console.log(`✅ Subscription created: ${subscription?.id}`)
    
    console.log('\n🎉 All multi-tenant tests passed!')
    
    return {
      organizations: [org1, org2],
      users: [user1, user2],
      projects: [project1, project2],
      auditLogs: auditLogs.length,
      subscription: subscription?.id
    }
    
  } catch (error) {
    console.error('❌ Multi-tenant test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testMultiTenancy()
  .then((results) => {
    console.log('\n📊 Test Results:')
    console.log(`- Organizations: ${results.organizations.length}`)
    console.log(`- Users: ${results.users.length}`)
    console.log(`- Projects: ${results.projects.length}`)
    console.log(`- Audit logs: ${results.auditLogs}`)
    console.log(`- Subscription: ${results.subscription}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })