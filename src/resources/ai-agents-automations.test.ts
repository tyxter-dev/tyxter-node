import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(responseBody: unknown = {}) {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        signal?: unknown;
      },
    ) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body,
      });
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_live_x',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

const defaultAgent = {
  name: 'Support agent',
  provider: 'openai' as const,
  model: 'gpt-4.1-mini',
  api_key: 'sk_test_123456',
  system_prompt: 'Answer billing and delivery questions using Tyxter account context.',
};

const defaultGraph = {
  version: 'automation_graph_v1' as const,
  nodes: [
    { id: 'manual', type: 'manual.trigger' as const, config: {} },
    {
      id: 'agent',
      type: 'ai_agent.invoke' as const,
      config: { ai_agent_id: 'ag_1', prompt: 'Summarize input.' },
    },
  ],
  edges: [{ id: 'manual_agent', source: 'manual', target: 'agent' }],
};

describe('AIAgentsResource', () => {
  it('creates agents with idempotency and trace headers', async () => {
    const { client, calls } = withCapture({ id: 'ag_1', object: 'ai_agent' });

    await client.aiAgents.create(defaultAgent, {
      idempotencyKey: 'idem_agent_1',
      traceId: 'trc_agent_1',
    });

    expect(calls[0]?.url).toBe('http://test/v1/ai-agents');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_agent_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_agent_1');
  });

  it.each([
    ['list', 'GET', '/v1/ai-agents?limit=10&include_archived=true'],
    ['retrieve', 'GET', '/v1/ai-agents/ag_1'],
    ['promptVersions', 'GET', '/v1/ai-agents/ag_1/prompt-versions?limit=5'],
    ['responseLogs', 'GET', '/v1/ai-agents/ag_1/response-logs?limit=5'],
    ['update', 'PATCH', '/v1/ai-agents/ag_1'],
    ['delete', 'DELETE', '/v1/ai-agents/ag_1'],
  ] as const)('%s calls the expected endpoint', async (methodName, method, path) => {
    const { client, calls } = withCapture({});

    if (methodName === 'list') await client.aiAgents.list({ limit: 10, include_archived: true });
    if (methodName === 'retrieve') await client.aiAgents.retrieve('ag_1');
    if (methodName === 'promptVersions')
      await client.aiAgents.listPromptVersions('ag_1', { limit: 5 });
    if (methodName === 'responseLogs') await client.aiAgents.listResponseLogs('ag_1', { limit: 5 });
    if (methodName === 'update') await client.aiAgents.update('ag_1', { enabled: false });
    if (methodName === 'delete') await client.aiAgents.delete('ag_1');

    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(`http://test${path}`);
  });

  it('invokes agent completions with a trace header', async () => {
    const { client, calls } = withCapture({ object: 'ai_agent_completion' });

    await client.aiAgents.complete(
      'ag_1',
      { messages: [{ role: 'user', content: 'Where is my order?' }] },
      { traceId: 'trc_complete_1', idempotencyKey: 'idem_ai_completion_1' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/ai-agents/ag_1/completions');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_complete_1');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_ai_completion_1');
  });
});

describe('AutomationsResource', () => {
  it('creates automations with idempotency and trace headers', async () => {
    const { client, calls } = withCapture({ id: 'aut_1', object: 'automation' });

    await client.automations.create(
      { name: 'Order follow-up' },
      { idempotencyKey: 'idem_aut_1', traceId: 'trc_aut_1' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/automations');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_aut_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_aut_1');
  });

  it.each([
    ['list', 'GET', '/v1/automations?limit=10&status=active'],
    ['retrieve', 'GET', '/v1/automations/aut_1'],
    ['update', 'PATCH', '/v1/automations/aut_1'],
    ['delete', 'DELETE', '/v1/automations/aut_1'],
    ['versions', 'GET', '/v1/automations/aut_1/versions?limit=5'],
    ['pause', 'POST', '/v1/automations/aut_1/pause'],
    ['resume', 'POST', '/v1/automations/aut_1/resume'],
    ['runs', 'GET', '/v1/automations/aut_1/runs?status=completed'],
    ['retrieveRun', 'GET', '/v1/automation-runs/run_1'],
    ['steps', 'GET', '/v1/automation-runs/run_1/steps?limit=20'],
    ['cancelRun', 'POST', '/v1/automation-runs/run_1/cancel'],
  ] as const)('%s calls the expected endpoint', async (methodName, method, path) => {
    const { client, calls } = withCapture({});

    if (methodName === 'list') await client.automations.list({ limit: 10, status: 'active' });
    if (methodName === 'retrieve') await client.automations.retrieve('aut_1');
    if (methodName === 'update') await client.automations.update('aut_1', { name: 'Updated' });
    if (methodName === 'delete') await client.automations.delete('aut_1');
    if (methodName === 'versions') await client.automations.listVersions('aut_1', { limit: 5 });
    if (methodName === 'pause') await client.automations.pause('aut_1');
    if (methodName === 'resume') await client.automations.resume('aut_1');
    if (methodName === 'runs') await client.automations.listRuns('aut_1', { status: 'completed' });
    if (methodName === 'retrieveRun') await client.automations.retrieveRun('run_1');
    if (methodName === 'steps') await client.automations.listRunSteps('run_1', { limit: 20 });
    if (methodName === 'cancelRun') await client.automations.cancelRun('run_1');

    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(`http://test${path}`);
  });

  it('pauses and resumes automations with idempotency and trace headers', async () => {
    const { client, calls } = withCapture({ id: 'aut_1', object: 'automation' });

    await client.automations.pause('aut_1', {
      idempotencyKey: 'idem_pause_1',
      traceId: 'trc_pause_1',
    });
    await client.automations.resume('aut_1', {
      idempotencyKey: 'idem_resume_1',
      traceId: 'trc_resume_1',
    });

    expect(calls[0]?.url).toBe('http://test/v1/automations/aut_1/pause');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_pause_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_pause_1');
    expect(calls[1]?.url).toBe('http://test/v1/automations/aut_1/resume');
    expect(calls[1]?.headers['idempotency-key']).toBe('idem_resume_1');
    expect(calls[1]?.headers['tyxter-trace-id']).toBe('trc_resume_1');
  });

  it('creates, publishes, runs, and invokes webhook endpoints with idempotency headers', async () => {
    const { client, calls } = withCapture({});

    await client.automations.createVersion(
      'aut_1',
      { graph: defaultGraph },
      { idempotencyKey: 'idem_version_1' },
    );
    await client.automations.publish(
      'aut_1',
      { version_id: 'ver_1' },
      { idempotencyKey: 'idem_publish_1' },
    );
    await client.automations.createRun(
      'aut_1',
      { input: { order_id: 'ord_1' }, trace_id: 'trc_run_1' },
      { idempotencyKey: 'idem_run_1' },
    );
    await client.automations.invokeWebhook(
      'orders-created',
      { input: { order_id: 'ord_2' } },
      { idempotencyKey: 'idem_webhook_1' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/automations/aut_1/versions');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_version_1');
    expect(calls[1]?.url).toBe('http://test/v1/automations/aut_1/publish');
    expect(calls[1]?.headers['idempotency-key']).toBe('idem_publish_1');
    expect(calls[2]?.url).toBe('http://test/v1/automations/aut_1/runs');
    expect(calls[2]?.headers['idempotency-key']).toBe('idem_run_1');
    expect(calls[3]?.url).toBe('http://test/v1/automation-webhooks/orders-created');
    expect(calls[3]?.headers['idempotency-key']).toBe('idem_webhook_1');
  });

  it('rotates a webhook-trigger secret on the two-segment path', async () => {
    const { client, calls } = withCapture({ object: 'automation_webhook_secret' });

    await client.automations.rotateWebhookSecret('aut_1', 'orders-created', {
      idempotencyKey: 'idem_rotate_1',
    });

    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe(
      'http://test/v1/automations/aut_1/webhook-triggers/orders-created/rotate-secret',
    );
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_rotate_1');
  });
});
