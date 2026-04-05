const fs = require('fs');
const path = require('path');

const directories = [
  'c:\\Academics\\project\\DevTrails\\app\\api\\admin\\zonal-stats',
  'c:\\Academics\\project\\DevTrails\\app\\api\\admin\\control-stats'
];

directories.forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } catch (error) {
    console.error(`✗ Error creating ${dir}:`, error.message);
  }
});

console.log('\nAll directories created successfully!');
