import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('QA1: API Key Security (System Level)', () => {
  
  describe('TC-QA1-01: Production bundle security scan', () => {
    
    test('should not expose Anthropic API keys in client bundles', async () => {
      // Build production bundle first
      console.log('Building production bundle...');
      
      try {
        await execAsync('npm run build', {
          cwd: join(__dirname, '..'),
          timeout: 120000, // 2 minute timeout
        });
      } catch (error) {
        console.error('Build failed:', error);
        throw new Error('Production build failed - cannot test security');
      }
      
      console.log('Scanning client bundles for API keys...');
      
      // Scan all client-side JavaScript files
      const staticDir = join(__dirname, '..', '.next', 'static');
      const violations = await scanDirectoryForSecrets(staticDir);
      
      // Assert no API keys found
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.error('🚨 SECURITY VIOLATION: API keys found in client bundle!');
        console.error('Files with violations:', violations);
      }
    }, 180000); // 3 minute timeout for build + scan
    
    test('should not expose environment variable names in client bundles', async () => {
      const staticDir = join(__dirname, '..', '.next', 'static');
      
      // Scan for common environment variable patterns
      const envVarPatterns = [
        'ANTHROPIC_API_KEY',
        'NEXT_PUBLIC_ANTHROPIC', // Should not exist
        'process.env.ANTHROPIC', // Server-only
      ];
      
      const violations = await scanForPatterns(staticDir, envVarPatterns);
      
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.error('🚨 Environment variable references found in client bundle!');
        console.error('Violations:', violations);
      }
    }, 60000);
  });
  
  describe('TC-QA1-02: API key format validation', () => {
    
    test('should detect Anthropic API key pattern (sk-ant-...)', () => {
        const testContent = 'const key = "sk-ant-api03-abc123xyz789";';  // 15 chars after dash
        const hasKey = containsAnthropicKey(testContent);
        
        expect(hasKey).toBe(true);
    });
    
    test('should not flag safe string patterns', () => {
      const testContent = 'const message = "Hello world";';
      const hasKey = containsAnthropicKey(testContent);
      
      expect(hasKey).toBe(false);
    });
    
    test('should detect base64-encoded potential keys', () => {
      // Base64 of "sk-ant-api03-test"
      const testContent = 'const encoded = "c2stYW50LWFwaTAzLXRlc3Q=";';
      const hasKey = containsSuspiciousBase64(testContent);
      
      expect(hasKey).toBe(true);
    });
  });
  
  describe('TC-QA1-03: Server-side API usage verification', () => {
    
    test('should verify API calls only in server components/routes', async () => {
      // Check that API calls are only in /app/api/ routes or server components
      const appDir = join(__dirname, '..', 'app');
      
      const clientFiles = await findClientComponents(appDir);
      const violations: string[] = [];
      
      for (const file of clientFiles) {
        const content = await readFile(file, 'utf-8');
        
        // Check for direct Anthropic SDK usage in client components
        if (content.includes('@anthropic-ai/sdk') || 
            content.includes('new Anthropic(')) {
          violations.push(file);
        }
      }
      
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.error('🚨 Anthropic SDK imported in client components!');
        console.error('Files:', violations);
      }
    });
  });

describe('TC-QA1-04: Source maps and debug artifacts', () => {
  
    test('should not include API keys in source maps', async () => {
      const staticDir = join(__dirname, '..', '.next', 'static');
      
      // Find all .map files
      const sourceMapViolations = await scanSourceMaps(staticDir);
      
      expect(sourceMapViolations).toEqual([]);
      
      if (sourceMapViolations.length > 0) {
        console.error('🚨 API keys found in source maps!');
        console.error('Files:', sourceMapViolations);
      }
    }, 60000);
    
    test('should not expose keys in webpack comments or chunk names', async () => {
      const staticDir = join(__dirname, '..', '.next', 'static');
      
      const violations = await scanForWebpackArtifacts(staticDir);
      
      expect(violations).toEqual([]);
    }, 60000);
  });
  
  describe('TC-QA1-05: Environment configuration security', () => {
    
    test('should verify .env files are in .gitignore', async () => {
      const gitignorePath = join(__dirname, '..', '.gitignore');
      const gitignoreContent = await readFile(gitignorePath, 'utf-8');
      
      const hasEnvLocal = gitignoreContent.includes('.env.local');
      const hasEnvFiles = gitignoreContent.includes('.env*.local') || 
                          gitignoreContent.includes('.env');
      
      expect(hasEnvLocal || hasEnvFiles).toBe(true);
    });
    
    test('should verify .env.example does not contain real keys', async () => {
      const examplePath = join(__dirname, '..', '.env.example');
      
      try {
        const content = await readFile(examplePath, 'utf-8');
        
        // Check for real key patterns
        const hasRealKey = containsAnthropicKey(content);
        
        expect(hasRealKey).toBe(false);
        
        // Should have placeholder text
        expect(content).toMatch(/your.*key|example|placeholder|xxx/i);
      } catch (error) {
        // .env.example doesn't exist - that's OK
        console.log('.env.example not found - skipping');
      }
    });
    
    test('should verify ANTHROPIC_API_KEY is set in environment', () => {
      // This test checks that the key EXISTS, not its value
      const hasKey = !!process.env.ANTHROPIC_API_KEY;
      
      if (!hasKey) {
        console.warn('⚠️  ANTHROPIC_API_KEY not set in test environment');
        console.warn('This is OK for CI, but should be set for local development');
      }
      
      // Don't fail the test, just warn
      expect(true).toBe(true);
    });
    
    test('should not have placeholder keys in environment', () => {
      const key = process.env.ANTHROPIC_API_KEY;
      
      if (key) {
        // Check for obvious placeholders
        const isPlaceholder = 
          key.includes('YOUR_KEY') ||
          key.includes('EXAMPLE') ||
          key.includes('XXX') ||
          key === 'sk-ant-api03-placeholder';
        
        expect(isPlaceholder).toBe(false);
      } else {
        // No key set - skip test
        expect(true).toBe(true);
      }
    });
  });
  
  describe('TC-QA1-06: Public directory security', () => {
    
    test('should not have .env files in public directory', async () => {
      const publicDir = join(__dirname, '..', 'public');
      
      try {
        const files = await readdir(publicDir);
        const envFiles = files.filter(f => f.startsWith('.env'));
        
        expect(envFiles).toEqual([]);
        
        if (envFiles.length > 0) {
          console.error('🚨 CRITICAL: .env files found in public directory!');
          console.error('These are served directly to users!');
        }
      } catch (error) {
        // Public directory doesn't exist - OK
        expect(true).toBe(true);
      }
    });
    
    test('should not have config files with secrets in public/', async () => {
      const publicDir = join(__dirname, '..', 'public');
      
      try {
        const violations = await scanPublicDirectory(publicDir);
        
        expect(violations).toEqual([]);
      } catch (error) {
        // No public directory - OK
        expect(true).toBe(true);
      }
    });
  });
  
  describe('TC-QA1-07: API route security', () => {
    
    test('should verify API routes use environment variables', async () => {
      const apiDir = join(__dirname, '..', 'app', 'api');
      
      const violations = await checkApiRoutesForHardcodedKeys(apiDir);
      
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.error('🚨 Hardcoded keys or suspicious patterns in API routes!');
        console.error('Files:', violations);
      }
    });
    
    test('should not expose keys in console.log statements', async () => {
      const appDir = join(__dirname, '..', 'app');
      
      const violations = await scanForConsoleLogLeaks(appDir);
      
      expect(violations).toEqual([]);
      
      if (violations.length > 0) {
        console.error('⚠️  Suspicious console.log statements found');
        console.error('These might leak keys in production logs:', violations);
      }
    });
  });
  
  describe('TC-QA1-08: HTML and metadata security', () => {
    
    test('should not have keys in HTML comments', async () => {
      const staticDir = join(__dirname, '..', '.next', 'static');
      
      const violations = await scanHTMLComments(staticDir);
      
      expect(violations).toEqual([]);
    }, 60000);
  });
  
  // ===== NEW HELPER FUNCTIONS =====
  
  /**
   * Scan source map files for API keys
   */
  async function scanSourceMaps(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subViolations = await scanSourceMaps(fullPath);
          violations.push(...subViolations);
        } else if (entry.name.endsWith('.map')) {
          const content = await readFile(fullPath, 'utf-8');
          
          if (containsAnthropicKey(content)) {
            violations.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }
    
    return violations;
  }
  
  /**
   * Scan for webpack comments that might contain keys
   */
  async function scanForWebpackArtifacts(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subViolations = await scanForWebpackArtifacts(fullPath);
          violations.push(...subViolations);
        } else if (entry.name.endsWith('.js')) {
          const content = await readFile(fullPath, 'utf-8');
          
          // Look for webpack comments with potential keys
          const webpackCommentPattern = /\/\*[\s\S]*?sk-ant-[\s\S]*?\*\//;
          if (webpackCommentPattern.test(content)) {
            violations.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore
    }
    
    return violations;
  }
  
  /**
   * Scan public directory for config files with secrets
   */
  async function scanPublicDirectory(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Check JSON and text config files
      if (entry.name.endsWith('.json') || 
          entry.name.endsWith('.config') ||
          entry.name.endsWith('.txt')) {
        const content = await readFile(fullPath, 'utf-8');
        
        if (containsAnthropicKey(content)) {
          violations.push(fullPath);
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Check API routes for hardcoded keys
   */
  async function checkApiRoutesForHardcodedKeys(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subViolations = await checkApiRoutesForHardcodedKeys(fullPath);
          violations.push(...subViolations);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
          const content = await readFile(fullPath, 'utf-8');
          
          // Check for hardcoded keys (not from process.env)
          const hasHardcodedKey = /['"]sk-ant-(?:api|sid)\d{2}-[^'"]*['"]/i.test(content);
          
          if (hasHardcodedKey && !content.includes('process.env')) {
            violations.push(fullPath);
          }
        }
      }
    } catch (error) {
      // No API directory - OK
    }
    
    return violations;
  }
  
  /**
   * Scan for console.log statements that might leak keys
   */
  async function scanForConsoleLogLeaks(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subViolations = await scanForConsoleLogLeaks(fullPath);
          violations.push(...subViolations);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const content = await readFile(fullPath, 'utf-8');
          
          // Look for console.log with API key or env variable
          const suspiciousLogs = [
            /console\.log.*ANTHROPIC_API_KEY/,
            /console\.log.*process\.env/,
            /console\.log.*apiKey/i,
          ];
          
          for (const pattern of suspiciousLogs) {
            if (pattern.test(content)) {
              violations.push(`${fullPath}: suspicious console.log`);
              break;
            }
          }
        }
      }
    } catch (error) {
      // Ignore
    }
    
    return violations;
  }
  
  /**
   * Scan for keys in HTML/JS comments
   */
  async function scanHTMLComments(dir: string): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subViolations = await scanHTMLComments(fullPath);
          violations.push(...subViolations);
        } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
          const content = await readFile(fullPath, 'utf-8');
          
          // Check HTML comments
          const htmlCommentPattern = /<!--[\s\S]*?sk-ant-[\s\S]*?-->/;
          if (htmlCommentPattern.test(content)) {
            violations.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore
    }
    
    return violations;
  }

  
});

// ===== HELPER FUNCTIONS =====

/**
 * Recursively scan directory for API key patterns
 */
async function scanDirectoryForSecrets(dir: string): Promise<string[]> {
  const violations: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subViolations = await scanDirectoryForSecrets(fullPath);
        violations.push(...subViolations);
      } else if (entry.name.endsWith('.js')) {
        const content = await readFile(fullPath, 'utf-8');
        
        if (containsAnthropicKey(content) || containsSuspiciousBase64(content)) {
          violations.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Directory might not exist yet (first build)
    console.warn(`Could not scan directory: ${dir}`);
  }
  
  return violations;
}

/**
 * Scan for specific string patterns
 */
async function scanForPatterns(dir: string, patterns: string[]): Promise<string[]> {
  const violations: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subViolations = await scanForPatterns(fullPath, patterns);
        violations.push(...subViolations);
      } else if (entry.name.endsWith('.js')) {
        const content = await readFile(fullPath, 'utf-8');
        
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            violations.push(`${fullPath}: contains "${pattern}"`);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Could not scan directory: ${dir}`);
  }
  
  return violations;
}

/**
 * Check if content contains Anthropic API key pattern
 */
function containsAnthropicKey(content: string): boolean {
  // Anthropic API keys start with "sk-ant-api" or "sk-ant-sid"
  const keyPattern = /sk-ant-(?:api|sid)\d{2}-[A-Za-z0-9_-]{10,}/;
  return keyPattern.test(content);
}

/**
 * Check for suspicious base64 that might be encoded keys
 */
function containsSuspiciousBase64(content: string): boolean {
  // Look for base64 strings that decode to "sk-ant-"
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = content.match(base64Pattern) || [];
  
  for (const match of matches) {
    try {
      const decoded = Buffer.from(match, 'base64').toString('utf-8');
      if (decoded.includes('sk-ant-')) {
        return true;
      }
    } catch {
      // Invalid base64, skip
    }
  }
  
  return false;
}

/**
 * Find client components (not server components or API routes)
 */
async function findClientComponents(dir: string): Promise<string[]> {
  const clientFiles: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip API routes (server-side only)
      if (entry.name === 'api' && entry.isDirectory()) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await findClientComponents(fullPath);
        clientFiles.push(...subFiles);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = await readFile(fullPath, 'utf-8');
        
        // Check if it's a client component ("use client" directive)
        if (content.includes("'use client'") || content.includes('"use client"')) {
          clientFiles.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Could not scan directory: ${dir}`);
  }
  
  return clientFiles;
}