
import { SkillManager } from '../main/skillManager';
import { app } from 'electron';
import * as path from 'path';

async function verify() {
  console.log('Starting verification...');
  
  // Wait for app to be ready (though getPath might work before)
  await app.whenReady();
  
  const skillManager = new SkillManager();
  
  // Give it a moment to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const skills = skillManager.getAllSkills();
  console.log(`Total skills loaded: ${skills.length}`);
  
  const algoArt = skills.find(s => s.name === 'algorithmic-art');
  
  if (algoArt) {
    console.log('SUCCESS: Found algorithmic-art skill');
    console.log('Description:', algoArt.description.substring(0, 50) + '...');
    console.log('Prompt length:', algoArt.prompt.length);
    process.exit(0);
  } else {
    console.error('FAILURE: Could not find algorithmic-art skill');
    console.log('Available skills:', skills.map(s => s.name).join(', '));
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
