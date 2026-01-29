module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI/CD
        'chore',    // Maintenance
        'revert',   // Revert commit
        'security', // Security fix
        'data',     // Data ingestion/update
      ],
    ],
    'subject-case': [2, 'always', 'sentence-case'],
  },
};
