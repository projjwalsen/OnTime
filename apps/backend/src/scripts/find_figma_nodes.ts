import fs from 'fs';

const content = fs.readFileSync('C:/Users/Atif-R0006/.gemini/antigravity-ide/brain/7141ba64-4703-4cbf-b9ba-13c5b7f82c83/.system_generated/steps/1834/output.txt', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
  if (line.includes('4:47') || line.includes('Dashboard') || line.includes('4:48')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
