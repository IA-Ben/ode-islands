// Comprehensive navigation test for chapters, sub-chapters, and custom buttons

const puppeteer = require('puppeteer');

async function testNavigation() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('=== Testing Chapter List Route ===');
  await page.goto('http://localhost:5000/before/stories');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-chapter-list.png' });
  
  // Check for chapters and badges
  const chapters = await page.$$('.bg-white.rounded-lg.shadow-md');
  console.log(`Found ${chapters.length} chapters`);
  
  // Check for AR badges
  const arBadges = await page.$$('.bg-purple-100.text-purple-800');
  console.log(`Found ${arBadges.length} AR badges`);
  
  // Check for sub-chapter counts
  const subChapterBadges = await page.$$('.bg-blue-100.text-blue-800');
  console.log(`Found ${subChapterBadges.length} sub-chapter badges`);
  
  console.log('\n=== Testing Chapter Detail Route ===');
  // Click on first chapter
  await page.click('.bg-white.rounded-lg.shadow-md:first-child');
  await page.waitForNavigation();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-chapter-detail.png' });
  
  // Check breadcrumbs
  const breadcrumbs = await page.$('nav.flex.items-center.space-x-2');
  console.log(`Breadcrumbs exist: ${breadcrumbs !== null}`);
  
  // Check story cards
  const storyCards = await page.$('.prose');
  console.log(`Story cards displayed: ${storyCards !== null}`);
  
  // Check custom buttons
  const customButtons = await page.$$('button');
  console.log(`Found ${customButtons.length} custom buttons`);
  
  console.log('\n=== Testing Sub-Chapter Route ===');
  // Navigate to a sub-chapter
  await page.goto('http://localhost:5000/before/story/edd348bf-37f3-4232-8fd3-4969a621b92b/20e3adc2-f9a4-42d0-bb3d-5d4d0998b58c');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-sub-chapter.png' });
  
  console.log('\n=== Testing AR Index Route ===');
  await page.goto('http://localhost:5000/before/ar');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-ar-index.png' });
  
  // Check AR groups
  const arGroups = await page.$$('.bg-white.rounded-lg.shadow-md');
  console.log(`Found ${arGroups.length} AR groups`);
  
  console.log('\n✅ All navigation tests completed');
  await browser.close();
}

testNavigation().catch(console.error);