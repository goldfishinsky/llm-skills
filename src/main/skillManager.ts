import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Skill, SkillExecutionResult } from './types';
import { LLMManager } from './llmManager';

export class SkillManager {
  private skillsPath: string;
  private skills: Map<string, Skill>;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.skillsPath = path.join(userDataPath, 'skills.json');
    this.skills = new Map();
    this.loadSkills();
  }

  private loadSkills(): void {
    try {
      if (fs.existsSync(this.skillsPath)) {
        const data = fs.readFileSync(this.skillsPath, 'utf-8');
        const skillsArray: Skill[] = JSON.parse(data);
        skillsArray.forEach(skill => {
          this.skills.set(skill.id, skill);
        });
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

  private initializeDefaultSkills(): void {
    const defaultSkills: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Code Review',
        description: 'Review code and provide feedback on improvements, bugs, and best practices',
        prompt: 'You are an experienced code reviewer. Review the following code and provide constructive feedback:\n\n{code}\n\nFocus on:\n1. Potential bugs\n2. Code quality and readability\n3. Performance optimizations\n4. Best practices\n5. Security concerns',
        parameters: [
          {
            name: 'code',
            type: 'string',
            description: 'The code to review',
            required: true
          }
        ],
        temperature: 0.3,
        maxTokens: 2000
      },
      {
        name: 'Text Summarization',
        description: 'Summarize long texts into concise summaries',
        prompt: 'Summarize the following text in a concise manner:\n\n{text}\n\nProvide a summary that captures the key points.',
        parameters: [
          {
            name: 'text',
            type: 'string',
            description: 'The text to summarize',
            required: true
          }
        ],
        temperature: 0.5,
        maxTokens: 500
      },
      {
        name: 'Language Translation',
        description: 'Translate text between languages',
        prompt: 'Translate the following text from {sourceLang} to {targetLang}:\n\n{text}',
        parameters: [
          {
            name: 'text',
            type: 'string',
            description: 'The text to translate',
            required: true
          },
          {
            name: 'sourceLang',
            type: 'string',
            description: 'Source language',
            required: true
          },
          {
            name: 'targetLang',
            type: 'string',
            description: 'Target language',
            required: true
          }
        ],
        temperature: 0.3,
        maxTokens: 1000
      }
    ];

    defaultSkills.forEach(skillData => {
      this.createSkill(skillData);
    });
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

  async executeSkill(skillId: string, params: Record<string, any>, llmManager: LLMManager): Promise<SkillExecutionResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill with id ${skillId} not found`
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

      // Execute with LLM
      const response = await llmManager.chat(
        provider,
        model,
        [{ role: 'user', content: finalPrompt }],
        {
          temperature: skill.temperature,
          maxTokens: skill.maxTokens
        }
      );

      return {
        success: true,
        result: response.content,
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

