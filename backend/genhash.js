const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10).then(h => {
  console.log('NEW HASH:', h);
  // Verify it works
  bcrypt.compare('admin123', h).then(ok => console.log('Verify:', ok));
});