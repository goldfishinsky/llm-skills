/**
 * Custom Skill Tool
 * Converts custom skills into the Tool interface for use with LLMs
 */

import { Tool, CustomSkill, CustomSkillParameter } from '../types';
import { executeScript, checkDependencies, installDependencies } from '../scriptExecutor';

/**
 * Convert a CustomSkill to a Tool that can be used by the LLM
 */
export function createCustomSkillTool(skill: CustomSkill): Tool {
  // Build parameters schema from skill parameters
  const properties: Record<string, any> = {};
  const required: string[] = [];

  if (skill.parameters) {
    for (const param of skill.parameters) {
      properties[param.name] = {
        type: paramTypeToJsonType(param.type),
        description: param.description,
      };

      if (param.default !== undefined) {
        properties[param.name].default = param.default;
      }

      if (param.required) {
        required.push(param.name);
      }
    }
  }

  return {
    id: skill.id,
    name: skill.name,
    description: buildToolDescription(skill),
    parameters: {
      type: 'object',
      properties,
      required,
    },
    execute: async (params: Record<string, any>, onProgress?: (message: string) => void) => {
      const progress = (msg: string) => {
        console.log(`[CustomSkill:${skill.name}] ${msg}`);
        if (onProgress) onProgress(msg);
      };

      progress(`Executing custom skill: ${skill.name}`);

      // Check dependencies first
      const depCheck = await checkDependencies(skill);
      if (!depCheck.satisfied) {
        progress(`Missing dependencies: ${depCheck.missing.join(', ')}`);
        progress(`Installing dependencies...`);
        
        const installed = await installDependencies(skill, onProgress);
        if (!installed) {
          return `Error: Failed to install dependencies: ${depCheck.missing.join(', ')}.\n\nPlease install them manually.`;
        }
      }

      // Apply default values
      const finalParams = { ...params };
      if (skill.parameters) {
        for (const param of skill.parameters) {
          if (finalParams[param.name] === undefined && param.default !== undefined) {
            finalParams[param.name] = param.default;
          }
        }
      }

      // Validate required parameters
      if (skill.parameters) {
        for (const param of skill.parameters) {
          if (param.required && finalParams[param.name] === undefined) {
            return `Error: Missing required parameter: ${param.name}\n\nDescription: ${param.description}`;
          }
        }
      }

      // Execute the script
      try {
        const result = await executeScript(skill, finalParams, onProgress);

        if (result.success) {
          return result.output || 'Script completed successfully with no output.';
        } else {
          return `Error executing ${skill.name}:\n\n${result.error || 'Unknown error'}\n\nOutput:\n${result.output}`;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `Error executing ${skill.name}: ${errorMsg}`;
      }
    },
  };
}

/**
 * Build a comprehensive description for the tool
 */
function buildToolDescription(skill: CustomSkill): string {
  let description = skill.description;

  // Add parameter hints
  if (skill.parameters && skill.parameters.length > 0) {
    const paramHints = skill.parameters
      .map(p => `${p.name}${p.required ? '*' : ''}: ${p.description}`)
      .join('; ');
    description += ` Parameters: ${paramHints}`;
  }

  // Truncate to 1024 chars (API limit)
  if (description.length > 1024) {
    description = description.substring(0, 1021) + '...';
  }

  return description;
}

/**
 * Convert skill parameter type to JSON Schema type
 */
function paramTypeToJsonType(type: CustomSkillParameter['type']): string {
  switch (type) {
    case 'string':
    case 'file':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    default:
      return 'string';
  }
}

/**
 * Create tools from multiple custom skills
 */
export function createCustomSkillTools(skills: CustomSkill[]): Tool[] {
  return skills
    .filter(skill => skill.enabled)
    .map(skill => createCustomSkillTool(skill));
}
