
import { SkillManager } from '../main/skillManager';
import * as path from 'path';

// Mock Electron app path for standalone run
const mockUserData = path.join(process.cwd(), 'userData_test');
const mockAppPath = process.cwd();

// Mock app (minimal)
if (!process.versions.electron) {
  (global as any).app = {
    getPath: (name: string) => {
      if (name === 'userData') return mockUserData;
      if (name === 'downloads') return path.join(process.cwd(), 'downloads_test');
      return '';
    },
    getAppPath: () => mockAppPath
  };
}

async function runTest() {
  console.log('--- Starting Music Skill Test ---');
  
  const skillManager = new SkillManager();
  
  // Wait for async initialization if any (though constructor is sync currently)
  // But we need to make sure custom skills are loaded
  console.log('Loading custom skills...');
  
  // Directly reload to be sure
  skillManager.reloadCustomSkills();
  
  const skills = skillManager.getCustomSkills();
  console.log('Loaded skills:', skills.map(s => s.name));
  
  const musicSkill = skills.find(s => s.name === 'music-download');
  if (!musicSkill) {
    console.error('❌ music-download skill NOT found!');
    return;
  }
  console.log('✓ Found music-download skill');
  
  const tools = skillManager.getTools();
  const musicTool = tools.find(t => t.name === 'music-download');
  
  if (!musicTool) {
    console.error('❌ music-download tool NOT found in registered tools!');
    return;
  }
  console.log('✓ Found music-download tool');

  // Test execution
  console.log('Executing music-download tool...');
  const result = await musicTool.execute({
    query: 'test song',
    count: 1
  }, (progress) => {
    console.log(`[Progress] ${progress}`);
  });
  
  console.log('Execution Result:', result);
}

runTest().catch(console.error);
