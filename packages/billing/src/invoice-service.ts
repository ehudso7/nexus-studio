import { PrismaClient } from '@nexus/database'
import { StripeClient } from './stripe-client'

export class InvoiceService {
  constructor(
    private db: PrismaClient,
    private stripe: StripeClient
  ) {}

  async listInvoices(organizationId: string, limit = 10) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId }
    })

    if (!subscription) {
      return []
    }

    const stripeInvoices = await this.stripe.listInvoices(
      subscription.stripeCustomerId,
      limit
    )

    // Map Stripe invoices to our format
    const invoices = stripeInvoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status === 'paid' ? new Date(invoice.status_transitions.paid_at! * 1000) : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      items: invoice.lines.data.map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitAmount: item.price?.unit_amount || 0,
        amount: item.amount
      }))
    }))

    return invoices
  }

  async getInvoice(invoiceId: string) {
    const invoice = await this.stripe.retrieveInvoice(invoiceId)

    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status === 'paid' ? new Date(invoice.status_transitions.paid_at! * 1000) : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      customerName: invoice.customer_name,
      customerEmail: invoice.customer_email,
      billingAddress: invoice.customer_address,
      items: invoice.lines.data.map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitAmount: item.price?.unit_amount || 0,
        amount: item.amount
      }))
    }
  }

  async downloadInvoice(invoiceId: string) {
    const invoice = await this.stripe.retrieveInvoice(invoiceId)
    
    if (!invoice.invoice_pdf) {
      throw new Error('Invoice PDF not available')
    }

    return {
      url: invoice.invoice_pdf,
      filename: `invoice-${invoice.number || invoiceId}.pdf`
    }
  }

  async getUpcomingInvoice(organizationId: string) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId }
    })

    if (!subscription || subscription.status !== 'ACTIVE') {
      return null
    }

    try {
      const upcomingInvoice = await this.stripe.retrieveUpcomingInvoice(
        subscription.stripeCustomerId
      )

      return {
        amount: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        periodStart: new Date(upcomingInvoice.period_start * 1000),
        periodEnd: new Date(upcomingInvoice.period_end * 1000),
        dueDate: upcomingInvoice.due_date ? new Date(upcomingInvoice.due_date * 1000) : null,
        items: upcomingInvoice.lines.data.map(item => ({
          description: item.description || '',
          quantity: item.quantity || 1,
          unitAmount: item.price?.unit_amount || 0,
          amount: item.amount
        }))
      }
    } catch (error) {
      // No upcoming invoice
      return null
    }
  }

  async sendInvoice(invoiceId: string) {
    const invoice = await this.stripe.retrieveInvoice(invoiceId)
    
    if (invoice.status !== 'open') {
      throw new Error('Can only send open invoices')
    }

    // Stripe will send the invoice email
    await this.stripe.getStripeInstance().invoices.sendInvoice(invoiceId)

    // Log the action
    await this.db.auditLog.create({
      data: {
        action: 'INVOICE_SENT',
        resourceType: 'invoice',
        resourceId: invoiceId,
        metadata: {
          invoiceNumber: invoice.number,
          customerEmail: invoice.customer_email
        }
      }
    })
  }

  async createCustomInvoiceItem(params: {
    organizationId: string
    description: string
    amount: number
    quantity?: number
  }) {
    const subscription = await this.db.subscription.findUnique({
      where: { organizationId: params.organizationId }
    })

    if (!subscription) {
      throw new Error('No subscription found for organization')
    }

    // Create invoice item that will be added to next invoice
    const invoiceItem = await this.stripe.getStripeInstance().invoiceItems.create({
      customer: subscription.stripeCustomerId,
      description: params.description,
      amount: params.amount * 100, // Convert to cents
      quantity: params.quantity || 1,
      currency: 'usd'
    })

    return invoiceItem
  }

  async generateTaxInvoice(invoiceId: string) {
    // This would integrate with a tax service or generate a tax-compliant invoice
    const invoice = await this.getInvoice(invoiceId)
    
    // For now, just return the regular invoice data
    // In production, this would generate a proper tax invoice with:
    // - Tax registration numbers
    // - Itemized tax amounts
    // - Compliance with local tax laws
    
    return {
      ...invoice,
      taxNumber: process.env.COMPANY_TAX_NUMBER,
      taxRate: 0, // Would calculate based on customer location
      taxAmount: 0,
      totalWithTax: invoice.amount
    }
  }
}