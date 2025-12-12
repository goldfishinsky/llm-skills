/**
 * Custom Skills Loader
 * Loads and validates custom skills from the file system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { app } from 'electron';
import { CustomSkill, CustomSkillParameter, CustomSkillRuntime, CustomSkillsConfig } from './types';

// Default configuration
const DEFAULT_CONFIG: CustomSkillsConfig = {
  skillsDirectory: path.join(app.getPath('userData'), 'custom_skills'),
  allowNetworkAccess: false,
  allowedPaths: [app.getPath('downloads'), app.getPath('documents'), app.getPath('temp')],
  defaultTimeout: 60000, // 1 minute
  maxMemory: 512, // 512 MB
  additionalDirectories: [],
};

// YAML frontmatter parsing regex
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  runtime?: CustomSkillRuntime;
  script?: string;
  dependencies?: string[];
  parameters?: CustomSkillParameter[];
}

/**
 * Parse YAML frontmatter from SKILL.md content
 */
function parseSkillMetadata(content: string): { metadata: SkillMetadata; instructions: string } | null {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return null;
  }

  try {
    const yamlContent = match[1];
    const metadata = yaml.load(yamlContent) as SkillMetadata;
    const instructions = content.slice(match[0].length).trim();
    
    return { metadata, instructions };
  } catch (error) {
    console.error('Failed to parse SKILL.md frontmatter:', error);
    return null;
  }
}

/**
 * Validate skill metadata
 */
function validateSkillMetadata(metadata: SkillMetadata): string[] {
  const errors: string[] = [];

  if (!metadata.name) {
    errors.push('Missing required field: name');
  } else if (metadata.name.length > 64) {
    errors.push('name must be 64 characters or less');
  } else if (!/^[a-z0-9-]+$/.test(metadata.name)) {
    errors.push('name must contain only lowercase letters, numbers, and hyphens');
  }

  if (!metadata.description) {
    errors.push('Missing required field: description');
  } else if (metadata.description.length > 1024) {
    errors.push('description must be 1024 characters or less');
  }

  const validRuntimes: CustomSkillRuntime[] = ['python', 'node', 'shell', 'binary', 'prompt'];
  if (metadata.runtime && !validRuntimes.includes(metadata.runtime)) {
    errors.push(`runtime must be one of: ${validRuntimes.join(', ')}`);
  }

  if (metadata.parameters) {
    for (const param of metadata.parameters) {
      if (!param.name) {
        errors.push('Parameter missing name');
      }
      if (!param.type) {
        errors.push(`Parameter ${param.name} missing type`);
      }
      if (!param.description) {
        errors.push(`Parameter ${param.name} missing description`);
      }
    }
  }

  return errors;
}

/**
 * Load a single skill from a directory
 */
function loadSkillFromDirectory(skillDir: string): CustomSkill | null {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  
  if (!fs.existsSync(skillMdPath)) {
    console.log(`No SKILL.md found in ${skillDir}`);
    return null;
  }

  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const parsed = parseSkillMetadata(content);
    
    if (!parsed) {
      console.error(`Failed to parse SKILL.md in ${skillDir}`);
      return null;
    }

    const { metadata, instructions } = parsed;
    
    // Validate metadata
    const errors = validateSkillMetadata(metadata);
    if (errors.length > 0) {
      console.error(`Invalid SKILL.md in ${skillDir}:`, errors);
      return null;
    }

    // Determine script path
    let scriptPath = '';
    if (metadata.script) {
      scriptPath = path.join(skillDir, metadata.script);
      if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found: ${scriptPath}`);
        return null;
      }
    }

    // Create skill object
    const skill: CustomSkill = {
      id: `custom-${metadata.name}`,
      name: metadata.name,
      description: metadata.description,
      version: metadata.version || '1.0.0',
      runtime: metadata.runtime || 'shell',
      script: metadata.script,
      scriptPath,
      skillPath: skillDir,
      dependencies: metadata.dependencies,
      parameters: metadata.parameters,
      instructions,
      enabled: true,
    };

    // Default to prompt runtime if no script is provided
    if (!skill.script && !skill.runtime) {
      skill.runtime = 'prompt';
    }

    return skill;
  } catch (error) {
    console.error(`Error loading skill from ${skillDir}:`, error);
    return null;
  }
}

/**
 * Load all custom skills from the skills directory
 */
export function loadCustomSkills(config: Partial<CustomSkillsConfig> = {}): CustomSkill[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const skillsDir = finalConfig.skillsDirectory;

  // Ensure skills directory exists
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
    console.log(`Created skills directory: ${skillsDir}`);
    return [];
  }

  const skills: CustomSkill[] = [];
  
  // Helper to load from a specific directory
  const loadFromDir = (baseDir: string) => {
    if (!fs.existsSync(baseDir)) return;
    
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDir = path.join(baseDir, entry.name);
        // Check if already loaded (avoid duplicates by name)
        const existing = skills.find(s => s.name === entry.name);
        if (existing) {
          console.log(`Skipping duplicate skill: ${entry.name} in ${baseDir}`);
          continue;
        }
        
        const skill = loadSkillFromDirectory(skillDir);
        if (skill) {
          skills.push(skill);
          console.log(`Loaded custom skill: ${skill.name}`);
        }
      }
    }
  };

  // 1. Load from default directory
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
    console.log(`Created skills directory: ${skillsDir}`);
  }
  loadFromDir(skillsDir);

  // 2. Load from additional directories
  if (finalConfig.additionalDirectories) {
    for (const dir of finalConfig.additionalDirectories) {
      loadFromDir(dir);
    }
  }

  console.log(`Loaded ${skills.length} custom skill(s)`);
  return skills;
}

/**
 * Get the custom skills directory path
 */
export function getCustomSkillsDirectory(): string {
  return DEFAULT_CONFIG.skillsDirectory;
}

/**
 * Create a sample skill for demonstration
 */
export function createSampleSkill(): void {
  const skillsDir = DEFAULT_CONFIG.skillsDirectory;
  const sampleSkillDir = path.join(skillsDir, 'hello-world');

  if (fs.existsSync(sampleSkillDir)) {
    console.log('Sample skill already exists');
    return;
  }

  fs.mkdirSync(sampleSkillDir, { recursive: true });

  const skillMd = `---
name: hello-world
description: A simple example skill that greets the user
version: 1.0.0
runtime: shell
script: greet.sh
parameters:
  - name: name
    type: string
    required: true
    description: The name to greet
  - name: language
    type: string
    required: false
    description: Language for greeting (en, zh, es)
    default: en
---

# Hello World Skill

A simple demonstration skill that greets users in multiple languages.

## Usage

Invoke this skill when the user wants a greeting or to test custom skills.

## Examples

- "Say hello to John"
- "Greet me in Chinese"
`;

  const scriptSh = `#!/bin/bash
# Hello World Script

NAME="\${1:-World}"
LANG="\${2:-en}"

case "$LANG" in
  zh)
    echo "你好，$NAME！"
    ;;
  es)
    echo "¡Hola, $NAME!"
    ;;
  *)
    echo "Hello, $NAME!"
    ;;
esac

echo ""
echo "Output generated by custom skill at $(date)"
`;

  fs.writeFileSync(path.join(sampleSkillDir, 'SKILL.md'), skillMd);
  fs.writeFileSync(path.join(sampleSkillDir, 'greet.sh'), scriptSh);
  fs.chmodSync(path.join(sampleSkillDir, 'greet.sh'), '755');

  console.log(`Created sample skill at ${sampleSkillDir}`);
}

/**
 * Get configuration for custom skills
 */
export function getCustomSkillsConfig(): CustomSkillsConfig {
  return { ...DEFAULT_CONFIG };
}
