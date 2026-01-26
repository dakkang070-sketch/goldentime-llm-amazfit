const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATASET_PATH = path.join(__dirname, '../data/school_violence_training_data.jsonl');

async function inspectDataset() {
  console.log('🔍 Inspecting School Violence Training Dataset...');
  console.log(`📂 Path: ${DATASET_PATH}`);

  if (!fs.existsSync(DATASET_PATH)) {
    console.error('❌ Dataset file not found!');
    return;
  }

  const fileStream = fs.createReadStream(DATASET_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalLines = 0;
  let categoryStats = {};
  let severityStats = {};
  let totalTranscriptLength = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    try {
      const data = JSON.parse(line);
      const messages = data.messages;
      
      // Find assistant message (the label)
      const assistantMsg = messages.find(m => m.role === 'assistant');
      const userMsg = messages.find(m => m.role === 'user');
      
      if (assistantMsg && userMsg) {
        totalLines++;
        
        // Parse the JSON output in assistant message
        try {
          const content = JSON.parse(assistantMsg.content);
          
          // Count Categories
          const cat = content.category || 'Unknown';
          categoryStats[cat] = (categoryStats[cat] || 0) + 1;
          
          // Count Severity
          const sev = content.severity || 'Unknown';
          severityStats[sev] = (severityStats[sev] || 0) + 1;
          
          // Calculate Transcript Length (approx from user prompt)
          totalTranscriptLength += userMsg.content.length;
          
        } catch (e) {
          console.warn(`⚠️ Failed to parse assistant JSON content at line ${totalLines + 1}`);
        }
      }
    } catch (e) {
      console.warn(`⚠️ Invalid JSONL at line ${totalLines + 1}`);
    }
  }

  console.log('\n📊 Dataset Statistics:');
  console.log(`   Total Samples: ${totalLines}`);
  console.log(`   Avg Input Length: ${totalLines > 0 ? Math.round(totalTranscriptLength / totalLines) : 0} chars`);
  
  console.log('\n📈 Category Distribution:');
  Object.entries(categoryStats).forEach(([cat, count]) => {
    const percent = ((count / totalLines) * 100).toFixed(1);
    console.log(`   - ${cat.padEnd(20)}: ${count} (${percent}%)`);
  });

  console.log('\n🚨 Severity Distribution:');
  Object.entries(severityStats).forEach(([sev, count]) => {
    const percent = ((count / totalLines) * 100).toFixed(1);
    console.log(`   - ${sev.padEnd(20)}: ${count} (${percent}%)`);
  });

  if (totalLines < 10) {
    console.log('\n⚠️  Dataset is too small for meaningful training. Collect more data via the Dashboard.');
  } else {
    console.log('\n✅ Dataset looks ready for initial fine-tuning experiments.');
  }
}

inspectDataset();
