# Tyxter JavaScript SDK

TypeScript and JavaScript client for the Tyxter Messaging API, with typed resources
and a Node.js webhook signature verifier.

This checkout mirrors SDK **0.8.0** from source commit
`58524926a1fa9498bcfe3abb9d7aa8fd39be1e85`. [SOURCE.json](./SOURCE.json) records the selected source
revision and SHA-256 digests of its SDK inputs. Runtime TypeScript files are copied
without modification. Build configuration and repository guidance are generated
for this standalone checkout.

Install the published package in your application:

```sh
pnpm add @tyxter/sdk-js
```

Use Node.js 22.12 or newer. The package is ESM.

```ts
import { Tyxter, TyxterApiError } from '@tyxter/sdk-js';

const tyxter = new Tyxter({ apiKey: process.env.TYXTER_API_KEY! });

try {
  const message = await tyxter.whatsapp.sendText(
    {
      from: 'phone_number_id',
      to: '+5511999999999',
      body: 'Your order is ready.',
    },
    { idempotencyKey: crypto.randomUUID() },
  );
  console.log(message.id);
} catch (error) {
  if (error instanceof TyxterApiError) {
    console.error(error.code, error.requestId, error.traceId);
  }
  throw error;
}
```

Keep the same idempotency key when retrying the same write. The client accepts
`baseUrl`, `fetch` and `defaultTimeoutMs` options; the default API URL is
`https://api.tyxter.com` and the default timeout is 30 seconds. The client does
not automatically retry requests. Use `TyxterApiError.retryAfterMs` when the API
provides a retry delay, and handle transport errors separately.

For approved WhatsApp templates:

```ts
await tyxter.whatsapp.sendTemplate(
  {
    from: 'phone_number_id',
    to: '+5511999999999',
    name: 'order_ready',
    language: 'en_US',
    variables: { '1': 'ORD-123' },
  },
  { idempotencyKey: crypto.randomUUID() },
);
```

Explore the exported types and resource methods in [src/index.ts](./src/index.ts),
or consult the [Tyxter documentation](https://tyxter.com/docs).

The verifier is also available as a dedicated package export. Preserve the
unparsed request body when verifying a webhook:

```ts
import { verifyWebhookSignature } from '@tyxter/sdk-js/webhook-verifier';

const valid = verifyWebhookSignature({
  secret: webhookSecret,
  timestamp: timestampHeader,
  signature: signatureHeader,
  rawBody: rawRequestBody,
});
```

It verifies HMAC-SHA256 over `timestamp.rawBody` and rejects timestamps outside
the default five-minute tolerance. Reject an invalid signature before processing
the event.

To build and check this source checkout, use pnpm 11.20.0:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm pack
```

Portable tests cover SDK resource requests, error parsing, message builders and
webhook verification. Canonical API/error/webhook parity and route-coverage checks
run in the development monorepo and are excluded from this checkout because they
depend on private workspace packages. The Salvy documentation-discoverability
test also stays there because it checks the canonical monorepo README. Passing
these portable tests does not establish full API conformance.

Canonical development and npm publishing remain in the development monorepo.
This generated package has `private: true` to prevent accidental npm publication.
Report bugs or propose changes through [public issues](https://github.com/tyxter-dev/tyxter-node/issues);
see [CONTRIBUTING.md](./CONTRIBUTING.md). Release notes are in
[CHANGELOG.md](./CHANGELOG.md). The SDK is [MIT licensed](./LICENSE).
