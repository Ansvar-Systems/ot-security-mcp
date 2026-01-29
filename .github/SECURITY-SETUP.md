# GitHub Actions Security Setup

**Internal Documentation** - How to configure GitHub secrets for CI/CD.

## Required GitHub Secrets

### NPM_TOKEN

**Purpose:** Publish packages to npm registry

**How to create:**
1. Go to https://www.npmjs.com
2. Settings → Access Tokens
3. Generate New Token → Automation
4. Copy token
5. GitHub repo → Settings → Secrets and variables → Actions
6. New repository secret:
   - Name: `NPM_TOKEN`
   - Value: [paste token]

**Permissions:** Publish access to `@ansvar/ot-security-mcp`

## Security Notes

- Rotate keys regularly (recommended: every 90 days)
- Use `::add-mask::` in workflows to prevent secret logging
- Never commit secrets to repository

## Troubleshooting

**Error:** "npm publish failed: authentication required"
- Verify `NPM_TOKEN` is valid and not expired
- Check token has publish permissions for `@ansvar` scope
- Regenerate token if needed
