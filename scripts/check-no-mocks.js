const fs = require('fs');
const path = require('path');

let hasErrors = false;

function scanDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(fullPath, fs.readFileSync(fullPath, 'utf8'));
    }
  }
}

// 1. Check forbidden production pages
const forbiddenDirs = ['app/dashboard', 'app/tasks', 'app/rescue'];

forbiddenDirs.forEach(dir => {
  scanDir(path.join(__dirname, '..', dir), (filePath, content) => {
    // Check for static or dynamic imports of demo/mock modules
    const forbiddenPatterns = [
      /import\s+.*from\s+['"].*\/demo\/.*['"]/g,
      /import\s+.*from\s+['"].*\/mock\/.*['"]/g,
      /import\s+.*from\s+['"].*demoSeeder.*['"]/g,
      /import\s+.*from\s+['"].*mockCalendarService.*['"]/g,
      /import\(['"].*\/demo\/.*['"]\)/g,
      /import\(['"].*\/mock\/.*['"]\)/g,
    ];

    forbiddenPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        console.error(`[FAIL] Forbidden demo/mock import found in production path: ${filePath}`);
        hasErrors = true;
      }
    });
  });
});

// 2. Check providers for static mock imports or un-gated mock fallbacks
const providerFiles = [
  'lib/calendar/calendarProvider.ts',
  'lib/server/gmail.ts',
  'lib/ai/prompts.ts'
];

providerFiles.forEach(relPath => {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check top-level static imports of mock modules
  const staticMockImport = /^import\s+.*from\s+['"].*(mock|demoSeeder).*['"]/m;
  if (staticMockImport.test(content)) {
    console.error(`[FAIL] Production provider ${relPath} contains top-level static mock/demo import.`);
    hasErrors = true;
  }

  // If it references mock, ensure it checks isDemoMode()
  if (content.includes('mock') && !content.includes('isDemoMode')) {
    console.error(`[FAIL] Production provider ${relPath} references mock capabilities without gating via isDemoMode().`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n❌ Mock check failed. Production code must not import demo/mock modules.');
  process.exit(1);
} else {
  console.log('✅ Mock check passed. Clean production separation verified.');
  process.exit(0);
}
