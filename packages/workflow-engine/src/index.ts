import { Queue, Worker, Job } from 'bullmq';
import { prisma, WorkflowTrigger, WorkflowStatus } from '@nexus/database';
import { VM } from 'vm2';
import cronParser from 'cron-parser';
import { z } from 'zod';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay';
  config: any;
  outputs?: string[];
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export class WorkflowEngine {
  private queue: Queue;
  private worker: Worker;
  private webhookCallbacks: Map<string, (data: any) => Promise<void>>;

  constructor() {
    this.queue = new Queue('workflows', { connection: redis });
    this.webhookCallbacks = new Map();
    
    this.worker = new Worker(
      'workflows',
      async (job: Job) => {
        await this.executeWorkflow(job.data.workflowId, job.data.context);
      },
      { connection: redis }
    );
    
    // Start scheduled workflow checker
    this.startScheduledWorkflowChecker();
  }

  async triggerWorkflow(workflowId: string, context: any = {}): Promise<string> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || !workflow.isActive) {
      throw new Error('Workflow not found or inactive');
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'PENDING',
        context,
      },
    });

    await this.queue.add('execute', {
      workflowId,
      executionId: execution.id,
      context,
    });

    return execution.id;
  }

  async executeWorkflow(workflowId: string, context: any): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const nodes = workflow.nodes as WorkflowNode[];
    const edges = workflow.edges as WorkflowEdge[];
    
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'RUNNING',
        context,
      },
    });

    try {
      const executionContext = { ...context };
      const visitedNodes = new Set<string>();
      
      // Find trigger node
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Execute workflow from trigger
      await this.executeNode(
        triggerNode,
        nodes,
        edges,
        executionContext,
        visitedNodes
      );

      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async executeNode(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: any,
    visitedNodes: Set<string>
  ): Promise<void> {
    if (visitedNodes.has(node.id)) {
      return; // Prevent infinite loops
    }
    visitedNodes.add(node.id);

    // Execute node based on type
    switch (node.type) {
      case 'action':
        await this.executeAction(node, context);
        break;
      case 'condition':
        await this.executeCondition(node, nodes, edges, context, visitedNodes);
        return; // Condition handles its own flow
      case 'loop':
        await this.executeLoop(node, nodes, edges, context, visitedNodes);
        return; // Loop handles its own flow
      case 'delay':
        await this.executeDelay(node);
        break;
    }

    // Find and execute next nodes
    const nextEdges = edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      const nextNode = nodes.find(n => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, nodes, edges, context, visitedNodes);
      }
    }
  }

  private async executeAction(node: WorkflowNode, context: any): Promise<void> {
    const { type, config } = node.config;

    switch (type) {
      case 'http':
        await this.executeHttpAction(config, context);
        break;
      case 'email':
        await this.executeEmailAction(config, context);
        break;
      case 'database':
        await this.executeDatabaseAction(config, context);
        break;
      case 'script':
        await this.executeScriptAction(config, context);
        break;
      case 'webhook':
        await this.executeWebhookAction(config, context);
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  private async executeHttpAction(config: any, context: any): Promise<void> {
    const { url, method, headers, body } = config;
    
    const response = await fetch(this.replaceVariables(url, context), {
      method,
      headers: this.replaceVariables(headers, context),
      body: body ? JSON.stringify(this.replaceVariables(body, context)) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.statusText}`);
    }

    context.lastResponse = await response.json();
  }

  private async executeEmailAction(config: any, context: any): Promise<void> {
    // In production, integrate with email service
    console.log('Sending email:', {
      to: this.replaceVariables(config.to, context),
      subject: this.replaceVariables(config.subject, context),
      body: this.replaceVariables(config.body, context),
    });
  }

  private async executeDatabaseAction(config: any, context: any): Promise<void> {
    const { operation, table, data, where } = config;

    switch (operation) {
      case 'create':
        context.dbResult = await (prisma as any)[table].create({
          data: this.replaceVariables(data, context),
        });
        break;
      case 'update':
        context.dbResult = await (prisma as any)[table].update({
          where: this.replaceVariables(where, context),
          data: this.replaceVariables(data, context),
        });
        break;
      case 'delete':
        context.dbResult = await (prisma as any)[table].delete({
          where: this.replaceVariables(where, context),
        });
        break;
      case 'find':
        context.dbResult = await (prisma as any)[table].findMany({
          where: this.replaceVariables(where, context),
        });
        break;
    }
  }

  private async executeScriptAction(config: any, context: any): Promise<void> {
    const vm = new VM({
      timeout: 5000,
      sandbox: {
        context,
        console,
        fetch,
      },
    });

    const result = vm.run(config.script);
    if (result !== undefined) {
      context.scriptResult = result;
    }
  }

  private async executeWebhookAction(config: any, context: any): Promise<void> {
    const { webhookId } = config;
    const callback = this.webhookCallbacks.get(webhookId);
    
    if (callback) {
      await callback(context);
    }
  }

  private async executeCondition(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: any,
    visitedNodes: Set<string>
  ): Promise<void> {
    const { expression } = node.config;
    
    const vm = new VM({
      timeout: 1000,
      sandbox: { context },
    });

    const result = vm.run(`(${expression})`);
    
    const nextEdges = edges.filter(e => e.source === node.id);
    const trueEdge = nextEdges.find(e => e.condition === 'true');
    const falseEdge = nextEdges.find(e => e.condition === 'false');

    const nextEdge = result ? trueEdge : falseEdge;
    if (nextEdge) {
      const nextNode = nodes.find(n => n.id === nextEdge.target);
      if (nextNode) {
        await this.executeNode(nextNode, nodes, edges, context, visitedNodes);
      }
    }
  }

  private async executeLoop(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: any,
    visitedNodes: Set<string>
  ): Promise<void> {
    const { items, variable } = node.config;
    const itemsToIterate = this.replaceVariables(items, context);
    
    const loopEdges = edges.filter(e => e.source === node.id);
    const bodyEdge = loopEdges.find(e => e.condition === 'body');
    const exitEdge = loopEdges.find(e => e.condition === 'exit');

    if (!bodyEdge) return;

    for (const item of itemsToIterate) {
      context[variable] = item;
      
      const bodyNode = nodes.find(n => n.id === bodyEdge.target);
      if (bodyNode) {
        const loopVisited = new Set(visitedNodes);
        await this.executeNode(bodyNode, nodes, edges, context, loopVisited);
      }
    }

    if (exitEdge) {
      const exitNode = nodes.find(n => n.id === exitEdge.target);
      if (exitNode) {
        await this.executeNode(exitNode, nodes, edges, context, visitedNodes);
      }
    }
  }

  private async executeDelay(node: WorkflowNode): Promise<void> {
    const { duration } = node.config;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private replaceVariables(value: any, context: any): any {
    if (typeof value === 'string') {
      return value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const keys = path.split('.');
        let result = context;
        for (const key of keys) {
          result = result?.[key];
        }
        return result !== undefined ? result : match;
      });
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.replaceVariables(item, context));
    }
    
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.replaceVariables(val, context);
      }
      return result;
    }
    
    return value;
  }

  private async startScheduledWorkflowChecker(): Promise<void> {
    setInterval(async () => {
      const workflows = await prisma.workflow.findMany({
        where: {
          trigger: 'SCHEDULE',
          isActive: true,
        },
      });

      for (const workflow of workflows) {
        const nodes = workflow.nodes as WorkflowNode[];
        const triggerNode = nodes.find(n => n.type === 'trigger');
        
        if (!triggerNode?.config?.schedule) continue;

        try {
          const interval = cronParser.parseExpression(triggerNode.config.schedule);
          const nextRun = interval.next().toDate();
          
          // Check if it's time to run
          const lastRun = workflow.lastRunAt;
          if (!lastRun || lastRun < nextRun) {
            await this.triggerWorkflow(workflow.id, {
              trigger: 'schedule',
              scheduledTime: nextRun,
            });
            
            await prisma.workflow.update({
              where: { id: workflow.id },
              data: { lastRunAt: new Date() },
            });
          }
        } catch (error) {
          console.error(`Error checking schedule for workflow ${workflow.id}:`, error);
        }
      }
    }, 60000); // Check every minute
  }

  registerWebhookCallback(webhookId: string, callback: (data: any) => Promise<void>): void {
    this.webhookCallbacks.set(webhookId, callback);
  }

  async stop(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}