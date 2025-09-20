const { chromium } = require('playwright');

async function takeScreenshots() {
  console.log('Starting visual testing with screenshots...\n');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Test 1: Chapter List Route
    console.log('📸 Test 1: Chapter List Route (/before/stories)');
    await page.goto('http://localhost:5000/before/stories');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-chapter-list.png', fullPage: true });
    
    // Check for elements
    const chapters = await page.$$('.bg-white.rounded-lg');
    console.log(`   ✅ Found ${chapters.length} chapter cards`);
    
    const arBadges = await page.$$text('AR Content');
    console.log(`   ✅ AR badges visible: ${arBadges.length > 0}`);
    
    const subChapterTexts = await page.$$text('Sub-chapters');
    console.log(`   ✅ Sub-chapter counts visible: ${subChapterTexts.length > 0}`);
    
    // Test 2: Chapter Detail Route
    console.log('\n📸 Test 2: Chapter Detail Route');
    await page.goto('http://localhost:5000/before/story/edd348bf-37f3-4232-8fd3-4969a621b92b');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-chapter-detail.png', fullPage: true });
    
    const breadcrumb = await page.$('nav');
    console.log(`   ✅ Breadcrumb navigation: ${breadcrumb !== null}`);
    
    const storyTitle = await page.$('h1');
    const titleText = storyTitle ? await storyTitle.textContent() : '';
    console.log(`   ✅ Chapter title displayed: "${titleText}"`);
    
    const buttons = await page.$$('button');
    console.log(`   ✅ Custom buttons found: ${buttons.length}`);
    
    // Test 3: Sub-Chapter Detail Route
    console.log('\n📸 Test 3: Sub-Chapter Detail Route');
    await page.goto('http://localhost:5000/before/story/edd348bf-37f3-4232-8fd3-4969a621b92b/20e3adc2-f9a4-42d0-bb3d-5d4d0998b58c');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-sub-chapter.png', fullPage: true });
    
    const subTitle = await page.$('h1');
    const subTitleText = subTitle ? await subTitle.textContent() : '';
    console.log(`   ✅ Sub-chapter title: "${subTitleText}"`);
    
    // Test 4: AR Index Route
    console.log('\n📸 Test 4: AR Index Route');
    await page.goto('http://localhost:5000/before/ar');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-ar-index.png', fullPage: true });
    
    const arTitle = await page.$('h1');
    const arTitleText = arTitle ? await arTitle.textContent() : '';
    console.log(`   ✅ AR page title: "${arTitleText}"`);
    
    const arGroups = await page.$$('.bg-white.rounded-lg.shadow-md');
    console.log(`   ✅ AR groups displayed: ${arGroups.length}`);
    
    console.log('\n✅ All screenshots saved successfully!');
    console.log('   - test-chapter-list.png');
    console.log('   - test-chapter-detail.png');
    console.log('   - test-sub-chapter.png');
    console.log('   - test-ar-index.png');
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();