# Security Policy

## Supported Versions

We actively maintain security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:

**security@ansvar.eu**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Security Measures

### Dependency Management

- All dependencies are automatically scanned using:
  - npm audit (daily)
  - Dependabot (GitHub)
  - Snyk (integration available)

- Dependencies are kept up-to-date with automated PRs

### Code Scanning

- **CodeQL**: Automated code scanning for security vulnerabilities
- **Semgrep**: Static analysis security testing (SAST)
- **ESLint**: Code quality and security rules
- **TypeScript**: Type safety to prevent common errors

### Supply Chain Security

- **SBOM Generation**: CycloneDX SBOM generated for each release
- **Provenance**: NPM package published with provenance statements
- **License Compliance**: Automated license checking for all dependencies
- **OpenSSF Scorecard**: Security health metrics tracking

### Data Security

- **No sensitive data storage**: Server does not store user credentials
- **Read-only operations**: Database queries are parameterized to prevent SQL injection
- **Input validation**: All user inputs validated using JSON schemas
- **Audit logging**: Ingestion operations logged for compliance

### Secure Development

- **Code Review**: All changes require review before merge
- **Git Hooks**: Pre-commit hooks enforce linting, formatting, and tests
- **Branch Protection**: Main branch protected with required checks
- **Signed Commits**: Recommended for contributors

## Compliance

This project follows security best practices from:

- **OWASP**: Top 10 security risks
- **NIST**: Secure Software Development Framework (SSDF)
- **OpenSSF**: Best Practices Badge criteria
- **EU Cybersecurity Act**: Software security requirements

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed and patched.

- **Critical**: < 24 hours
- **High**: < 7 days
- **Medium**: < 30 days
- **Low**: Next planned release

## Contact

For security concerns, contact: security@ansvar.eu

For general questions, contact: info@ansvar.eu
