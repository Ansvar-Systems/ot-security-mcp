# Privacy Policy

Updated: 2026-02-14

This project provides a read-only MCP server for OT security reference data.

## Data We Process

- Tool input parameters provided by the MCP client (queries, filters, identifiers).
- Tool output payloads generated from local datasets.
- Operational metadata such as timestamps and runtime errors.

## Data Collection and Retention

- The server does not require end-user accounts.
- By default, the server does not persist full conversation history.
- If deployed behind platform logging, retention and access control are managed by the deployer.

## Third-Party Services

- Runtime lookups are served from local packaged data unless explicitly configured otherwise.
- MCP clients and hosting providers may process request metadata under their own policies.

## Security and Transport

- Use TLS for all remote deployments.
- If authentication is enabled, use OAuth 2.0 with certificates from recognized authorities.

## Contact

- Email: `hello@ansvar.eu`
- Security reporting: see `/Users/jeffreyvonrotz/Projects/ot-security-mcp/SECURITY.md`

