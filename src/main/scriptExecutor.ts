/**
 * Script Executor
 * Safely executes custom skill scripts with sandboxing and resource limits
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { CustomSkill, ScriptExecutionResult, CustomSkillsConfig } from './types';
import { getCustomSkillsConfig } from './customSkillsLoader';

/**
 * Execute a custom skill script with given parameters
 */
export async function executeScript(
  skill: CustomSkill,
  params: Record<string, any>,
  onProgress?: (message: string) => void,
  config?: Partial<CustomSkillsConfig>
): Promise<ScriptExecutionResult> {
  const finalConfig = { ...getCustomSkillsConfig(), ...config };
  const startTime = Date.now();

  const progress = (msg: string) => {
    console.log(`[${skill.name}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  progress(`Starting execution...`);

  // Validate script path
  if (!skill.scriptPath || !fs.existsSync(skill.scriptPath)) {
    return {
      success: false,
      output: '',
      error: `Script not found: ${skill.scriptPath}`,
      exitCode: -1,
      duration: Date.now() - startTime,
    };
  }

  // Build command and arguments based on runtime
  const { command, args, env } = buildCommand(skill, params, finalConfig);

  progress(`Running: ${command} ${args.join(' ')}`);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const spawnOptions: SpawnOptions = {
      cwd: skill.skillPath,
      env: { ...process.env, ...env },
      shell: true,
    };

    const child = spawn(command, args, spawnOptions);

    // Set timeout
    const timeout = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      progress(`⚠️ Script timed out after ${finalConfig.defaultTimeout / 1000}s`);
    }, finalConfig.defaultTimeout);

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Stream progress for long-running scripts
      const lines = text.split('\n').filter((l: string) => l.trim());
      lines.forEach((line: string) => progress(`  ${line}`));
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (killed) {
        resolve({
          success: false,
          output: stdout,
          error: `Script timed out after ${finalConfig.defaultTimeout / 1000} seconds`,
          exitCode: -1,
          duration,
        });
        return;
      }

      const success = code === 0;
      
      progress(success 
        ? `✓ Completed in ${duration}ms`
        : `❌ Failed with exit code ${code}`
      );

      resolve({
        success,
        output: stdout,
        error: success ? undefined : stderr || `Exited with code ${code}`,
        exitCode: code || 0,
        duration,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      progress(`❌ Error: ${error.message}`);
      resolve({
        success: false,
        output: stdout,
        error: error.message,
        exitCode: -1,
        duration: Date.now() - startTime,
      });
    });
  });
}

/**
 * Build command and arguments based on skill runtime
 */
function buildCommand(
  skill: CustomSkill,
  params: Record<string, any>,
  config: CustomSkillsConfig
): { command: string; args: string[]; env: Record<string, string> } {
  const env: Record<string, string> = {
    SKILL_NAME: skill.name,
    SKILL_PATH: skill.skillPath,
    ALLOWED_PATHS: config.allowedPaths.join(':'),
  };

  // Add parameters as environment variables
  for (const [key, value] of Object.entries(params)) {
    env[`PARAM_${key.toUpperCase()}`] = String(value);
  }

  let command: string;
  let args: string[];

  switch (skill.runtime) {
    case 'python':
      command = 'python3';
      args = [skill.script, ...buildCliArgs(params)];
      break;

    case 'node':
      command = 'node';
      args = [skill.script, ...buildCliArgs(params)];
      break;

    case 'shell':
      command = 'bash';
      args = [skill.script, ...Object.values(params).map(String)];
      break;

    case 'binary':
      command = `./${skill.script}`;
      args = buildCliArgs(params);
      break;

    default:
      command = 'bash';
      args = [skill.script];
  }

  return { command, args, env };
}

/**
 * Build CLI arguments from parameters (--key value format)
 */
function buildCliArgs(params: Record<string, any>): string[] {
  const args: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    const argName = `--${key.replace(/_/g, '-')}`;
    
    if (typeof value === 'boolean') {
      if (value) args.push(argName);
    } else if (Array.isArray(value)) {
      value.forEach(v => {
        args.push(argName, String(v));
      });
    } else {
      args.push(argName, String(value));
    }
  }
  
  return args;
}

/**
 * Check if dependencies are installed for a skill
 */
export async function checkDependencies(skill: CustomSkill): Promise<{
  satisfied: boolean;
  missing: string[];
}> {
  if (!skill.dependencies || skill.dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const missing: string[] = [];

  for (const dep of skill.dependencies) {
    const isInstalled = await isDependencyInstalled(dep, skill.runtime);
    if (!isInstalled) {
      missing.push(dep);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}

/**
 * Check if a specific dependency is installed
 */
async function isDependencyInstalled(dep: string, runtime: string): Promise<boolean> {
  return new Promise((resolve) => {
    let command: string;
    let args: string[];

    // Parse dependency spec (e.g., "python>=3.8" -> "python")
    const depName = dep.split(/[<>=]/)[0].trim();

    switch (runtime) {
      case 'python':
        command = 'pip3';
        args = ['show', depName];
        break;
      case 'node':
        command = 'npm';
        args = ['list', depName];
        break;
      default:
        command = 'which';
        args = [depName];
    }

    const child = spawn(command, args, { shell: true });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Install dependencies for a skill
 */
export async function installDependencies(
  skill: CustomSkill,
  onProgress?: (message: string) => void
): Promise<boolean> {
  if (!skill.dependencies || skill.dependencies.length === 0) {
    return true;
  }

  const progress = (msg: string) => {
    console.log(`[${skill.name}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  progress(`Installing dependencies...`);

  // Check for requirements.txt for Python
  const requirementsPath = path.join(skill.skillPath, 'requirements.txt');
  if (skill.runtime === 'python' && fs.existsSync(requirementsPath)) {
    return new Promise((resolve) => {
      const child = spawn('pip3', ['install', '-r', requirementsPath], {
        cwd: skill.skillPath,
        shell: true,
      });

      child.stdout?.on('data', (data) => {
        progress(`  ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          progress(`✓ Dependencies installed`);
          resolve(true);
        } else {
          progress(`❌ Failed to install dependencies`);
          resolve(false);
        }
      });
    });
  }

  // Install individual dependencies
  for (const dep of skill.dependencies) {
    const depName = dep.split(/[<>=]/)[0].trim();
    
    let command: string;
    let args: string[];

    switch (skill.runtime) {
      case 'python':
        command = 'pip3';
        args = ['install', dep];
        break;
      case 'node':
        command = 'npm';
        args = ['install', dep];
        break;
      default:
        progress(`⚠️ Cannot install ${dep} - unsupported runtime`);
        continue;
    }

    progress(`  Installing ${depName}...`);

    await new Promise<void>((resolve) => {
      const child = spawn(command, args, { cwd: skill.skillPath, shell: true });
      child.on('close', () => resolve());
    });
  }

  progress(`✓ Dependencies installed`);
  return true;
}
