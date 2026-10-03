# Contributing

This repository is a generated, one-way source mirror of released
`@tyxter/sdk-js` versions. Canonical implementation and npm publishing remain in
the development monorepo. Direct edits to generated files may be replaced by a
subsequent export.

Use [public issues](https://github.com/tyxter-dev/tyxter-node/issues) for bugs,
questions and proposed changes. Include the installed SDK version, Node.js
version, a minimal reproduction, the expected behavior and the observed result.
API failures are easier to investigate with their `error.code`, `request_id` or
`trace_id` when available.

Remove API keys, webhook secrets, phone numbers and customer payloads from public
reports. Use fictional input and redacted logs. Do not post credentials in issues
or pull requests.

The build, typecheck and portable-test commands are documented in README.md.
The full workspace contract tests run in the canonical development repository.
Maintainers carry accepted changes there and export a later published release.
