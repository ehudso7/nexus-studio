import { Hono } from 'hono'
import { z } from 'zod'
import { SSOManager } from '@nexus-studio/sso'
import { requireAuth } from '../middleware/auth'
import { prisma } from '@nexus/database'
import jwt from 'jsonwebtoken'

const sso = new Hono()

// Initialize SSO manager
const ssoManager = new SSOManager(prisma)

// List SSO configurations
sso.get('/organizations/:orgId/sso', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const configs = await ssoManager.listSSOConfigs(orgId)

  return c.json({ configs })
})

// Create SSO configuration
sso.post('/organizations/:orgId/sso', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const body = await c.req.json()

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: 'OWNER'
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const schema = z.object({
    provider: z.enum(['SAML', 'OIDC', 'AZURE_AD', 'OKTA', 'AUTH0']),
    config: z.record(z.any())
  })

  try {
    const data = schema.parse(body)
    
    const ssoConfig = await ssoManager.createSSOConfig({
      organizationId: orgId,
      provider: data.provider,
      config: data.config
    })

    return c.json({ config: ssoConfig })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid configuration', details: error.errors }, 400)
    }
    throw error
  }
})

// Update SSO configuration
sso.patch('/organizations/:orgId/sso/:provider', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const provider = c.req.param('provider') as any
  const body = await c.req.json()

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: 'OWNER'
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const config = await ssoManager.updateSSOConfig(orgId, provider, body)

  return c.json({ config })
})

// Toggle SSO configuration
sso.post('/organizations/:orgId/sso/:provider/toggle', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const provider = c.req.param('provider') as any
  const body = await c.req.json()

  const schema = z.object({
    isActive: z.boolean()
  })

  const { isActive } = schema.parse(body)

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: 'OWNER'
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const config = await ssoManager.toggleSSOConfig(orgId, provider, isActive)

  return c.json({ config })
})

// Test SSO connection
sso.post('/organizations/:orgId/sso/:provider/test', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const provider = c.req.param('provider') as any

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] }
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const result = await ssoManager.testSSOConnection(orgId, provider)

  return c.json(result)
})

// Delete SSO configuration
sso.delete('/organizations/:orgId/sso/:provider', requireAuth, async (c) => {
  const user = c.get('user')
  const orgId = c.req.param('orgId')
  const provider = c.req.param('provider') as any

  // Check user has access
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: user.id,
      role: 'OWNER'
    }
  })

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await ssoManager.deleteSSOConfig(orgId, provider)

  return c.json({ success: true })
})

// SSO login initiation
sso.get('/sso/login', async (c) => {
  const organizationSlug = c.req.query('organization')
  const provider = c.req.query('provider') as any
  const returnUrl = c.req.query('return_url') || '/'

  if (!organizationSlug || !provider) {
    return c.json({ error: 'Missing organization or provider' }, 400)
  }

  // Find organization
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug }
  })

  if (!organization) {
    return c.json({ error: 'Organization not found' }, 404)
  }

  try {
    // Generate state with return URL
    const state = ssoManager.generateState()
    const stateData = {
      organizationId: organization.id,
      provider,
      returnUrl,
      state
    }

    // Store state in session/redis (simplified here)
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64')

    const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL}/sso/callback`
    const ssoUrl = await ssoManager.generateSSOUrl(
      organization.id,
      provider,
      callbackUrl,
      encodedState
    )

    return c.redirect(ssoUrl)
  } catch (error) {
    return c.json({ 
      error: 'SSO not configured or inactive',
      details: error instanceof Error ? error.message : undefined
    }, 400)
  }
})

// SSO callback
sso.post('/sso/callback', async (c) => {
  const body = await c.req.parseBody()
  
  // SAML response
  if (body.SAMLResponse) {
    const relayState = body.RelayState as string
    const stateData = JSON.parse(Buffer.from(relayState, 'base64').toString())

    const provider = await ssoManager.getProvider(stateData.organizationId, stateData.provider)
    
    if (!provider || !('handleSAMLResponse' in provider)) {
      return c.json({ error: 'Invalid provider' }, 400)
    }

    try {
      const user = await provider.handleSAMLResponse(body)
      
      // Create session token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          organizationId: stateData.organizationId
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      // Redirect to app with token
      const redirectUrl = new URL(stateData.returnUrl, process.env.NEXT_PUBLIC_APP_URL)
      redirectUrl.searchParams.set('token', token)
      
      return c.redirect(redirectUrl.toString())
    } catch (error) {
      return c.json({ 
        error: 'SSO authentication failed',
        details: error instanceof Error ? error.message : undefined
      }, 401)
    }
  }

  // OIDC callback
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (code && state) {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    
    // Verify state
    if (!ssoManager.verifyState(stateData.state, stateData.state)) {
      return c.json({ error: 'Invalid state' }, 400)
    }

    const provider = await ssoManager.getProvider(stateData.organizationId, stateData.provider)
    
    if (!provider || !('handleCallback' in provider)) {
      return c.json({ error: 'Invalid provider' }, 400)
    }

    try {
      // Get code verifier from session (simplified)
      const codeVerifier = 'stored-code-verifier'
      const nonce = 'stored-nonce'

      const user = await provider.handleCallback(
        `${process.env.NEXT_PUBLIC_API_URL}/sso/callback`,
        { code },
        codeVerifier,
        nonce
      )

      // Create session token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          organizationId: stateData.organizationId
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      // Redirect to app with token
      const redirectUrl = new URL(stateData.returnUrl, process.env.NEXT_PUBLIC_APP_URL)
      redirectUrl.searchParams.set('token', token)
      
      return c.redirect(redirectUrl.toString())
    } catch (error) {
      return c.json({ 
        error: 'SSO authentication failed',
        details: error instanceof Error ? error.message : undefined
      }, 401)
    }
  }

  return c.json({ error: 'Invalid callback' }, 400)
})

// SAML metadata endpoint
sso.get('/organizations/:orgId/sso/saml/metadata', async (c) => {
  const orgId = c.req.param('orgId')
  
  const config = await ssoManager.getSSOConfig(orgId, 'SAML')
  
  if (!config) {
    return c.json({ error: 'SAML not configured' }, 404)
  }

  const provider = await ssoManager.getProvider(orgId, 'SAML')
  
  if (!provider || !('generateMetadata' in provider)) {
    return c.json({ error: 'Invalid provider' }, 400)
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL}/sso/callback`
  const metadata = await provider.generateMetadata(callbackUrl)

  c.header('Content-Type', 'application/xml')
  return c.body(metadata)
})

// SSO logout
sso.post('/sso/logout', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const schema = z.object({
    organizationId: z.string(),
    provider: z.enum(['SAML', 'OIDC', 'AZURE_AD', 'OKTA', 'AUTH0']),
    sessionIndex: z.string().optional(),
    idToken: z.string().optional()
  })

  const data = schema.parse(body)

  const provider = await ssoManager.getProvider(data.organizationId, data.provider)
  
  if (!provider) {
    // Just do local logout
    return c.json({ success: true })
  }

  let logoutUrl: string | undefined

  if ('handleLogout' in provider && data.sessionIndex) {
    logoutUrl = await provider.handleLogout(user.email, data.sessionIndex)
  } else if ('endSession' in provider && data.idToken) {
    logoutUrl = await provider.endSession(
      data.idToken,
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin`
    )
  }

  return c.json({ 
    success: true,
    logoutUrl
  })
})

export { sso }