// Generates course_init_id.js (run once)
// npm i uuid

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function generateCourseInitId() {
  const outputPath = path.join(__dirname, 'course_init_id.js');

  // If you want to overwrite every time, remove this block.
  if (fs.existsSync(outputPath)) {
    console.log('✓ course_init_id.js already exists. Skipping.');
    return;
  }

  const id = uuidv4();
  const content = `// This file can be removed for non-coursework use cases
const courseInitId = '${id}';
module.exports = { courseInitId };
`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('✓ course_init_id.js created:', id);
}

generateCourseInitId();
