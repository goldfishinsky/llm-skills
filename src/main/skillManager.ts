import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Skill, SkillExecutionResult, Tool } from './types';
import { musicDownloadTool } from './tools/musicTool';
import { jobSearchTool } from './tools/jobSearchTool';

export class SkillManager {
  private skillsPath: string;
  private skills: Map<string, Skill>;
  private tools: Map<string, Tool>;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.skillsPath = path.join(userDataPath, 'skills.json');
    this.skills = new Map();
    this.tools = new Map();
    this.registerTools();
    this.loadSkills();
  }

  private registerTools(): void {
    this.tools.set(musicDownloadTool.id, musicDownloadTool);
    this.tools.set(jobSearchTool.id, jobSearchTool);
  }

  private loadSkills(): void {
    try {
      if (fs.existsSync(this.skillsPath)) {
        const data = fs.readFileSync(this.skillsPath, 'utf-8');
        const skillsArray: Skill[] = JSON.parse(data);
        skillsArray.forEach(skill => {
          this.skills.set(skill.id, skill);
        });
        this.ensureDefaultSkills();
      } else {
        // Initialize with default skills
        this.initializeDefaultSkills();
      }
    } catch (error) {
      console.error('Error loading skills:', error);
      this.skills = new Map();
    }
  }

  private saveSkills(): void {
    try {
      const skillsArray = Array.from(this.skills.values());
      fs.writeFileSync(this.skillsPath, JSON.stringify(skillsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving skills:', error);
      throw new Error('Failed to save skills');
    }
  }

  private ensureDefaultSkills(): void {
    const defaultSkills = this.getDefaultSkills();
    const existingNames = new Set(Array.from(this.skills.values()).map(s => s.name));
    
    defaultSkills.forEach(skillData => {
      if (!existingNames.has(skillData.name)) {
        console.log(`Adding missing default skill: ${skillData.name}`);
        this.createSkill(skillData);
      }
    });
  }

  private initializeDefaultSkills(): void {
    const defaultSkills = this.getDefaultSkills();
    defaultSkills.forEach(skillData => {
      this.createSkill(skillData);
    });
  }

  private getDefaultSkills(): Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Music Downloader',
        description: 'Find and download music based on a description',
        prompt: 'You are a music assistant. Help the user find and download music matching their description.\n\nUser Request: {description}',
        parameters: [
          {
            name: 'description',
            type: 'string',
            description: 'Description of the music to download',
            required: true
          }
        ],
        temperature: 0.7,
        maxTokens: 1000,
        tools: ['music_download']
      },
      {
        name: 'Job Search',
        description: 'Search for job listings on LinkedIn, Indeed, or Glassdoor based on location and time posted',
        prompt: 'You are a job search assistant. Help the user find job listings matching their criteria.\\n\\nUser Request: {query}',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Job search query including location, platform, and other preferences',
            required: true
          }
        ],
        temperature: 0.5,
        maxTokens: 2000,
        tools: ['job_search']
      }
    ];
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getSkill(skillId: string): Skill | null {
    return this.skills.get(skillId) || null;
  }

  createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const now = Date.now();
    const skill: Skill = {
      ...skillData,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    this.skills.set(skill.id, skill);
    this.saveSkills();
    return skill;
  }

  updateSkill(skillId: string, skillData: Partial<Skill>): Skill {
    const existingSkill = this.skills.get(skillId);
    if (!existingSkill) {
      throw new Error(`Skill with id ${skillId} not found`);
    }

    const updatedSkill: Skill = {
      ...existingSkill,
      ...skillData,
      id: skillId,
      createdAt: existingSkill.createdAt,
      updatedAt: Date.now()
    };

    this.skills.set(skillId, updatedSkill);
    this.saveSkills();
    return updatedSkill;
  }

  deleteSkill(skillId: string): boolean {
    const deleted = this.skills.delete(skillId);
    if (deleted) {
      this.saveSkills();
    }
    return deleted;
  }

  async executeSkill(
    skillId: string,
    params: Record<string, any>,
    llmManager: any,
    onProgress?: (message: string) => void
  ): Promise<SkillExecutionResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`
      };
    }

    try {
      // Validate parameters
      for (const param of skill.parameters) {
        if (param.required && !(param.name in params)) {
          return {
            success: false,
            error: `Missing required parameter: ${param.name}`
          };
        }
      }

      // Replace placeholders in prompt
      let finalPrompt = skill.prompt;
      for (const [key, value] of Object.entries(params)) {
        const placeholder = `{${key}}`;
        finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Get settings
      const settings = llmManager.getSettings();
      const provider = skill.provider || settings.defaultProvider;
      const model = skill.model || settings.defaultModel;

      // Prepare tools if enabled
      let systemPrompt = '';
      if (skill.tools && skill.tools.length > 0) {
        const enabledTools = skill.tools.map(id => this.tools.get(id)).filter(t => t !== undefined) as Tool[];
        if (enabledTools.length > 0) {
          systemPrompt = `\nYou have access to the following tools:\n${enabledTools.map(t => 
            `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
          ).join('\n')}\n\nTo use a tool, respond with ONLY a JSON object in this format:\n{"tool": "tool_name", "parameters": {...}}\n`;
        }
      }

      // Execute with LLM
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: finalPrompt }
      ];

      const response = await llmManager.chat(
        provider,
        model,
        messages,
        {
          temperature: skill.temperature,
          maxTokens: skill.maxTokens
        },
        skill.apiKey
      );

      // Check for tool execution
      let result = response.content;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const toolCall = JSON.parse(jsonMatch[0]);
          if (toolCall.tool && toolCall.parameters) {
            const tool = Array.from(this.tools.values()).find(t => t.name === toolCall.tool);
            if (tool) {
              const toolResult = await tool.execute(toolCall.parameters, onProgress);
              result = `Tool Execution Result: ${toolResult}`;
            }
          }
        }
      } catch (e) {
        // Not a tool call or failed to parse, treat as normal text
      }

      return {
        success: true,
        result: result,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private generateId(): string {
    return `skill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

