const fs = require('fs');
let code = fs.readFileSync('functions/src/services/ai/reelPipeline.ts', 'utf8');

code = code.replace(
  'additionalMessage?: string; creativeTemplateContext?: import(\'./creativeTemplateContext\').CreativeTemplateContext;',
  'additionalMessage?: string;\n  creativeTemplateContext?: import(\'./creativeTemplateContext\').CreativeTemplateContext;\n  adaptedCreativePlan?: import(\'./templateAdaptation\').AdaptedCreativePlan;'
);

code = code.replace(
  /const \{ business, goal, style, durationSeconds, offer, cta, additionalMessage, clipAnalyses,[\s\S]+?creativeTemplateContext \} = input;/,
  'const { business, goal, style, durationSeconds, offer, cta, additionalMessage, clipAnalyses, creativeTemplateContext, adaptedCreativePlan } = input;'
);

code = code.replace(
  '',
  '\n'
);

fs.writeFileSync('functions/src/services/ai/reelPipeline.ts', code);
