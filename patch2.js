const fs = require('fs');
let code = fs.readFileSync('functions/src/services/ai/pipeline.ts', 'utf8');

code = code.replace(
  '',
  '\n'
);

fs.writeFileSync('functions/src/services/ai/pipeline.ts', code);
