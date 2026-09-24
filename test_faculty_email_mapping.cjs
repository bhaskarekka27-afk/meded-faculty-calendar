const assert = require('assert');

console.log('🧪 Testing Faculty Email Mapping for bhaskarekka27@gmail.com -> Dr. Rajesh Jambhulkar');

const { reminderEmailService } = require('./js/reminderEmailService.js');

const faculty = reminderEmailService.findFacultyByEmail('bhaskarekka27@gmail.com');
console.log('Found faculty for bhaskarekka27@gmail.com:', faculty);

assert.ok(faculty, 'Faculty should not be null');
assert.strictEqual(faculty.name, 'Dr. Rajesh Jambhulkar', 'Name must be Dr. Rajesh Jambhulkar');
assert.strictEqual(faculty.dept, 'Biochemistry', 'Department must be Biochemistry');
assert.strictEqual(faculty.email, 'bhaskarekka27@gmail.com', 'Email must be bhaskarekka27@gmail.com');

console.log('✅ PASS: Email mapping verified successfully!');
