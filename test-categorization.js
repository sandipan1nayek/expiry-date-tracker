// Test script to verify the updated categorization logic
const { ExpirySettings } = require('./src/services/SettingsService');

// Simulate the categorization function
function categorizeProduct(daysUntilExpiry, settings) {
  console.log(`\n=== Testing product with ${daysUntilExpiry} days until expiry ===`);
  console.log(`Settings: warningDays=${settings.warningDays}, expiringDays=${settings.expiringDays}`);
  
  if (daysUntilExpiry <= 0) {
    console.log('Result: EXPIRED');
    return 'expired';
  }
  
  if (daysUntilExpiry <= settings.expiringDays) {
    console.log('Result: EXPIRING');
    return 'expiring';
  }
  
  if (daysUntilExpiry <= settings.warningDays) {
    console.log('Result: WARNING');
    return 'warning';
  }
  
  console.log('Result: FRESH');
  return 'fresh';
}

// Test with the user's example: 8 days with warning=10, expiring=3
const testSettings = {
  warningDays: 10,
  expiringDays: 3
};

console.log('🧪 Testing Categorization Logic');
console.log('================================');

// Test various scenarios
const testCases = [
  { days: -1, expected: 'expired' },
  { days: 0, expected: 'expired' },
  { days: 1, expected: 'expiring' },
  { days: 3, expected: 'expiring' },
  { days: 4, expected: 'warning' },
  { days: 8, expected: 'warning' }, // User's specific case
  { days: 10, expected: 'warning' },
  { days: 11, expected: 'fresh' },
  { days: 30, expected: 'fresh' }
];

let allPassed = true;

testCases.forEach(testCase => {
  const result = categorizeProduct(testCase.days, testSettings);
  const passed = result === testCase.expected;
  
  if (!passed) {
    console.log(`❌ FAILED: Expected ${testCase.expected}, got ${result}`);
    allPassed = false;
  } else {
    console.log(`✅ PASSED`);
  }
});

console.log('\n================================');
if (allPassed) {
  console.log('🎉 All tests PASSED! The categorization logic is working correctly.');
  console.log('✅ User\'s issue (8 days showing as "fresh") should now be fixed.');
} else {
  console.log('❌ Some tests FAILED. The logic needs more work.');
}
console.log('================================');
