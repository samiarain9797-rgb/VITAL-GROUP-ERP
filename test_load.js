import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const html = await page.content();
  console.log('HTML SNIPPET:', html.substring(0, 500) + '... length: ' + html.length);
  const element = await page.$('#root');
  if (element) {
    console.log('ROOT HTML:', await page.evaluate(el => el.innerHTML, element));
  }
  await browser.close();
})();
