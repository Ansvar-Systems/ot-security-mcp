#!/usr/bin/env tsx
/**
 * Check for upstream data source updates.
 * Queries NIST OSCAL and MITRE STIX GitHub repos for new commits.
 */

const SOURCES = [
  {
    name: 'NIST 800-53 (OSCAL)',
    repo: 'usnistgov/oscal-content',
    path: 'nist.gov/SP800-53/rev5',
    branch: 'main',
  },
  {
    name: 'MITRE ATT&CK for ICS (STIX)',
    repo: 'mitre-attack/attack-stix-data',
    path: 'ics-attack',
    branch: 'master',
  },
];

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    committer: {
      date: string;
    };
  };
}

async function checkSource(source: (typeof SOURCES)[0]): Promise<void> {
  const url = `https://api.github.com/repos/${source.repo}/commits?path=${source.path}&sha=${source.branch}&per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    if (!response.ok) {
      console.error(`  x ${source.name}: HTTP ${response.status}`);
      return;
    }

    const commits = (await response.json()) as GitHubCommit[];
    if (commits.length === 0) {
      console.log(`  ? ${source.name}: No commits found`);
      return;
    }

    const latest = commits[0] as GitHubCommit;
    const date = new Date(latest.commit.committer.date);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

    const icon = daysAgo <= 7 ? '!' : 'ok';
    console.log(`  [${icon}] ${source.name}`);
    console.log(`    Latest commit: ${latest.sha.slice(0, 8)} (${daysAgo} days ago)`);
    console.log(`    Message: ${latest.commit.message.split('\n')[0]}`);
    console.log(
      `    URL: https://github.com/${source.repo}/commits/${source.branch}/${source.path}`
    );

    if (daysAgo <= 7) {
      console.log(`    [!] RECENT UPDATE - consider re-ingesting`);
    }
  } catch (error) {
    console.error(`  x ${source.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  console.log('=== OT Security MCP - Upstream Data Source Check ===\n');
  console.log(`Date: ${new Date().toISOString()}\n`);

  for (const source of SOURCES) {
    await checkSource(source);
    console.log('');
  }

  console.log('Done. Re-run ingestion scripts if any sources have been updated.');
}

main().catch(console.error);
