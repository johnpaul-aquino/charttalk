/**
 * Test script for rate limit functionality
 * Tests max, pro, and free plan limits
 */

import { prisma } from '../src/core/database/prisma.client.js';
import { UserRateLimitService } from '../src/modules/user/services/user-rate-limit.service.js';
import { PLAN_RATE_LIMITS } from '../src/shared/config/rate-limits.config.js';
import type { PlanType } from '../src/modules/user/services/jwt.service.js';

async function testPlanLimit(plan: PlanType, testUserId: string) {
  const service = new UserRateLimitService(prisma);
  const limit = PLAN_RATE_LIMITS[plan as keyof typeof PLAN_RATE_LIMITS]?.dailyCharts || 10;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${plan?.toUpperCase() || 'NULL'} plan (limit: ${limit} charts/day)`);
  console.log('='.repeat(60));

  // Set count to limit - 2 to quickly test the limit
  const startCount = limit - 2;
  await prisma.userRateLimit.upsert({
    where: { userId: testUserId },
    update: { dailyCount: startCount, lastReset: new Date() },
    create: { userId: testUserId, dailyCount: startCount, lastReset: new Date() },
  });

  console.log(`\nStarting at ${startCount}/${limit} (simulating near-limit state)...`);

  // Make requests until blocked
  for (let i = 1; i <= 5; i++) {
    const result = await service.checkAndIncrement(testUserId, plan);
    const status = result.allowed ? '✓ Allowed' : '✗ BLOCKED';
    console.log(`  Request ${i}: ${status} (${result.currentCount}/${result.limit}, remaining: ${result.remaining})`);

    if (!result.allowed) {
      console.log(`\n  ⚠️  LIMIT REACHED - API Response:`);
      console.log(`  {`);
      console.log(`    "success": false,`);
      console.log(`    "error": "${result.error}",`);
      console.log(`    "apiResponse": { "statusCode": 429 },`);
      console.log(`    "rateLimit": {`);
      console.log(`      "remaining": ${result.remaining},`);
      console.log(`      "limit": ${result.limit},`);
      console.log(`      "resetsAt": "${result.resetsAt.toISOString()}"`);
      console.log(`    }`);
      console.log(`  }`);
      break;
    }
  }

  // Cleanup
  await prisma.userRateLimit.delete({ where: { userId: testUserId } }).catch(() => {});
}

async function main() {
  // Disable Prisma query logging by setting DEBUG env
  delete process.env.DEBUG;

  console.log('🧪 Rate Limit Testing Script');
  console.log('============================\n');
  console.log('Plan limits configured:');
  console.log(`  - free: ${PLAN_RATE_LIMITS.free.dailyCharts} charts/day`);
  console.log(`  - pro:  ${PLAN_RATE_LIMITS.pro.dailyCharts} charts/day`);
  console.log(`  - max:  ${PLAN_RATE_LIMITS.max.dailyCharts} charts/day`);

  try {
    // Test each plan (in order requested: max, pro, free)
    await testPlanLimit('max', 'test-user-max');
    await testPlanLimit('pro', 'test-user-pro');
    await testPlanLimit('free', 'test-user-free');

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
