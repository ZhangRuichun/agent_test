const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
      executablePath: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/bin/chromium',
      env: {
        ...process.env,
        CHROME_PATH: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/bin/chromium',
        LD_LIBRARY_PATH: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/lib:/nix/store/nspr/lib:/nix/store/nss/lib:/nix/store/gtk3/lib:/nix/store/glib/lib:/nix/store/pango/lib:/nix/store/cairo/lib:/nix/store/dbus/lib:/nix/store/expat/lib:/nix/store/fontconfig/lib',
        FONTCONFIG_PATH: '/nix/store/fontconfig/etc/fonts'
      }
    });

    console.log('Creating new page...');
    const page = await browser.newPage();

    console.log('Navigating to example.com...');
    await page.goto('https://www.coca-cola.com/us/en/brands/coca-cola');

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'test.png' });

    console.log('Closing browser...');
    await browser.close();

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();