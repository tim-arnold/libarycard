const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });

async function takeScreenshots() {
  // Create timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  
  // Ensure screenshots directory exists
  const screenshotsDir = './screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Starting screenshot process...');
    
    // Navigate to the app (assuming it's running on localhost:3000)
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Take screenshot of login screen
    console.log('Taking screenshot of login screen...');
    const loginScreenPath = `${screenshotsDir}/login-screen_${timestamp}.png`;
    await page.screenshot({ 
      path: loginScreenPath,
      fullPage: true 
    });
    console.log(`Login screen screenshot saved as ${loginScreenPath}`);
    
    // Navigate to signin page
    console.log('Navigating to signin page...');
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle2' });
    
    // Take screenshot of actual signin page
    console.log('Taking screenshot of signin page...');
    const signinScreenPath = `${screenshotsDir}/signin-screen_${timestamp}.png`;
    await page.screenshot({ 
      path: signinScreenPath,
      fullPage: true 
    });
    console.log(`Signin screen screenshot saved as ${signinScreenPath}`);
    
    // Get credentials from environment
    const email = process.env.SCREENSHOT_USER;
    const password = process.env.SCREENSHOT_PASSWORD;
    
    if (!email || !password) {
      console.log('SCREENSHOT_USER and SCREENSHOT_PASSWORD must be set in .env.local');
      return;
    }
    
    console.log(`Attempting to sign in with ${email}...`);
    
    // First, click the "Sign in with Email" button to show the email form
    console.log('Looking for "Sign in with Email" button...');
    const buttons = await page.$$('button');
    let foundEmailButton = false;
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Sign in with Email')) {
        await button.click();
        foundEmailButton = true;
        console.log('Clicked "Sign in with Email" button');
        break;
      }
    }
    if (!foundEmailButton) {
      console.log('Could not find "Sign in with Email" button');
      return;
    }
    
    // Wait for the email form to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fill in the email field
    const emailInput = await page.$('input[type="email"], input[label="Email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 }); // Select all text
      await emailInput.type(email);
      console.log('Filled email field');
    } else {
      console.log('Could not find email input field');
      return;
    }
    
    // Fill in the password field
    const passwordInput = await page.$('input[type="password"], input[label="Password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 }); // Select all text
      await passwordInput.type(password);
      console.log('Filled password field');
    } else {
      console.log('Could not find password input field');
      return;
    }
    
    // Submit the form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('Sign in form submitted, waiting for navigation...');
      
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('Successfully signed in!');
        
        // Wait a moment for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take screenshot of library screen
        console.log('Taking screenshot of library screen...');
        const libraryScreenPath = `${screenshotsDir}/library-screen_${timestamp}.png`;
        await page.screenshot({ 
          path: libraryScreenPath,
          fullPage: true 
        });
        console.log(`Library screen screenshot saved as ${libraryScreenPath}`);
        
      } catch (error) {
        console.log('Navigation timeout or error - checking if we are on the library page...');
        
        // Check current URL to see if we're logged in
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl.includes('localhost:3000') && !currentUrl.includes('/auth/signin')) {
          console.log('Appears to be logged in, taking library screenshot...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          const libraryScreenPath2 = `${screenshotsDir}/library-screen_${timestamp}.png`;
          await page.screenshot({ 
            path: libraryScreenPath2,
            fullPage: true 
          });
          console.log(`Library screen screenshot saved as ${libraryScreenPath2}`);
        } else {
          console.log('Still on signin page, authentication may have failed');
          
          // Take a debug screenshot to see what's happening
          const debugScreenPath = `${screenshotsDir}/debug-signin-failure_${timestamp}.png`;
          await page.screenshot({ 
            path: debugScreenPath,
            fullPage: true 
          });
          console.log(`Debug screenshot saved as ${debugScreenPath}`);
        }
      }
    } else {
      console.log('Could not find submit button');
    }
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the screenshot function
takeScreenshots().catch(console.error);