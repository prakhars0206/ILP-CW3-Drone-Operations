import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let backendProcess: ChildProcess | null = null;

export async function startBackend(): Promise<void> {
  console.log('🚀 Starting Spring Boot backend...');
  
  const backendDir = path.resolve(__dirname, '../../../backend');
  
  // Start Spring Boot using Maven
  backendProcess = spawn('./mvnw', ['spring-boot:run'], {
    cwd: backendDir,
    stdio: 'pipe', // Capture output
    shell: true,
  });

  // Log backend output (optional - helpful for debugging)
  backendProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Started') || output.includes('ERROR')) {
      console.log(`[Backend] ${output.trim()}`);
    }
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  // Wait for backend to be ready
  console.log('⏳ Waiting for backend to be ready...');
  await waitForBackend('http://localhost:8080/api/v1/uid', 60000); // 60 second timeout
  console.log('✅ Backend is ready!');
}

export async function stopBackend(): Promise<void> {
    if (backendProcess) {
      console.log('🛑 Stopping backend...');
      
      return new Promise<void>((resolve) => {
        if (!backendProcess) {
          resolve();
          return;
        }
  
        // Set up exit handler
        backendProcess.on('exit', () => {
          console.log('✅ Backend stopped');
          backendProcess = null;
          resolve();
        });
  
        // Try graceful shutdown first
        backendProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        const forceKillTimer = setTimeout(() => {
          if (backendProcess && !backendProcess.killed) {
            console.log('⚠️  Force killing backend (SIGKILL)...');
            backendProcess.kill('SIGKILL');
            
            // Give it another second, then resolve anyway
            setTimeout(() => {
              backendProcess = null;
              resolve();
            }, 1000);
          }
        }, 5000);
        
        // Clear timer if process exits gracefully
        backendProcess.on('exit', () => {
          clearTimeout(forceKillTimer);
        });
      });
    }
  }

async function waitForBackend(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return; // Backend is ready!
      }
    } catch (error) {
      // Backend not ready yet, continue waiting
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Backend did not start within ${timeout}ms`);
}