require("dotenv").config();
const express = require("express"); // Adding Express
const app = express(); // Initializing Express
const path = require("path");
const puppeteer = require("puppeteer-extra");
const PluginStealth = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const fs = require("fs");
const fileUpload = require("express-fileupload");
var bodyParser = require("body-parser");
var stringSimilarity = require("string-similarity");
const randomUserAgent = require('random-useragent');
const targetHelpers = require("./scrappers/target_com/helpers.js");

const proxies = [
  ':ujca9kfd:p2320391',
  'http://pjydjspo:cbdrm7s5x57g:207.244.217.165:6712',
  'http://pjydjspo:cbdrm7s5x57g:107.172.163.27:6543',
  'http://pjydjspo:cbdrm7s5x57g:64.137.42.112:5157',
];

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function CSVToArray(strData, strDelimiter) {
  strDelimiter = strDelimiter || ",";

  var objPattern = new RegExp(
    // Delimiters.
    "(\\" +
    strDelimiter +
    "|\\r?\\n|\\r|^)" +
    // Quoted fields.
    '(?:"([^"]*(?:""[^"]*)*)"|' +
    // Standard fields.
    '([^"\\' +
    strDelimiter +
    "\\r\\n]*))",
    "gi"
  );

  var arrData = [[]];

  var arrMatches = null;

  while ((arrMatches = objPattern.exec(strData))) {
    var strMatchedDelimiter = arrMatches[1];
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      arrData.push([]);
    }

    var strMatchedValue;
    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      strMatchedValue = arrMatches[3];
    }

    arrData[arrData.length - 1].push(strMatchedValue);
  }

  return arrData;
}

puppeteer.use(PluginStealth());
puppeteer.use(
  AdblockerPlugin({
    blockTrackers: true, // default: false
  })
);

app.use(express.json());

app.use(fileUpload());

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/sites", function (req, res) {
  res.sendFile(path.join(__dirname + "/sites.json"));
});

app.get("/results.csv", function (req, res) {
  res.sendFile(path.join(__dirname + "/results.csv"));
});

app.post("/save", function (req, res) {
  const sites = JSON.stringify(req.body);

  fs.writeFile(path.join(__dirname + "/sites.json"), sites, function (err) {
    if (err) throw err;
    res.send("saved");
  });
});

app.post("/savecsv", function (req, res) {
  let lineArray = [];
  req.body.forEach(function (infoArray) {
    let line = infoArray.join(",");
    lineArray.push(line);
  });
  let csvContent = lineArray.join("\n");

  fs.writeFile(
    path.join(__dirname + "/results.csv"),
    csvContent,
    function (err) {
      if (err) throw err;
      res.send("saved");
    }
  );
});

app.post("/savecsv2", function (req, res) {
  let lineArray = [];
  req.body.forEach(function (infoArray) {
    let line = infoArray.join(",");
    lineArray.push(line);
  });
  let csvContent = lineArray.join("\n");

  fs.writeFile(
    path.join(__dirname + "/replaced.csv"),
    csvContent,
    function (err) {
      if (err) throw err;
      res.send("saved");
    }
  );
});

app.post("/upload", function (req, res) {
  const csv = req.files.csv.data;
  const csvArray = CSVToArray(csv, ",");
  res.send(csvArray);
});

const findVariant = async (page, size, sizes) => {
  const sizesSimilar = [];

  for (var i = 0; i < sizes.length; i++) {
    let sizeValue = await page.evaluate(
      (el) => el.textContent,
      sizes[i]
    );

    sizeValue = sizeValue.toLowerCase();

    let sizeSimilarity = stringSimilarity.compareTwoStrings(
      sizeValue,
      size
    );

    if (parseFloat(sizeSimilarity) > 0.6) {
      sizesSimilar.push({
        value: sizeValue,
        similarity: sizeSimilarity
      });
    }
  }

  return sizesSimilar;
}



let isProcessing = false;

async function randomMouseMove(page) {
  // Get the viewport size
  const viewport = await page.viewport();
  const width = viewport.width;
  const height = viewport.height;

  // Generate random coordinates within the viewport
  const randomX = Math.floor(Math.random() * width);
  const randomY = Math.floor(Math.random() * height);

  // Move the mouse to the random position
  await page.mouse.move(randomX, randomY);
}

let id = 0;
let browser = null;
let page = null;
let links = [];

(async function () {
  app.post("/start", async function (req, res) {
    try {
      res.send("start");
    } catch (error) {
      console.error("Start error:", error);
      res.status(500).send("Failed to start browser");
    }
  });

  app.post("/stop", async function (req, res) {
    try {
      res.send("stopped");
    } catch (error) {
      console.error("Stop error:", error);
      res.status(500).send("Failed to stop browser");
    }
  });

  app.post("/api", async function (req, res) {
    id = (id || 0) + 1;
    const lastTimeBeforeLauchBrowser = Date.now();
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ["--no-sandbox", "--disable-setuid-sandbox", `--proxy-server=${'http://georgia2.ddns.net:50004'}`],
    });
    page = await browser.newPage();
    await page.authenticate({
      username: 'ujca9kfd',
      password: 'p2320391',
    });
    await page.setDefaultNavigationTimeout(100000);
    console.log('browser launchTime', (Date.now() - lastTimeBeforeLauchBrowser) / 1000);
    console.log('api invoked', id);
    // if (id % 40 === 0) {
    //   await new Promise(resolve => setTimeout(resolve, randomNumber(10000, 20000)));
    //   console.log('take a break');
    // }
    // if (id % 120 === 0) {
    //   await new Promise(resolve => setTimeout(resolve, randomNumber(20000, 30000)));
    //   console.log('take a break');
    // }
    console.log('brower & page prepared');
    if (isProcessing) {
      console.log('still processing');
      return res.status(429).send({
        status: "busy",
        message: "Another request is being processed"
      });
    }

    if (!browser || !page) {
      return res.status(400).send({
        status: "error",
        message: "Browser not initialized. Please call /start first"
      });
    }
    // http://georgia2.ddns.net:50010 -U udb1bsxo:p1886170
    isProcessing = true;
    const { url, params } = req.body;
    const uid = url.replace(/[^a-zA-Z0-9]/g, "");
    const imagePath = path.join(__dirname, `/public/screenshots/${uid}.png`);

    let response = {
      status: "processing",
      image: `${uid}.png?v=${Date.now()}`,
    };

    try {
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.fanatics.com/",
        "DNT": "1", // Do Not Track
        "Upgrade-Insecure-Requests": "1",
      });



      const lastTimeBeforeNavigation = Date.now();
      page.goto(url, { waitUntil: "domcontentloaded" });
      console.log('navigation time', (Date.now() - lastTimeBeforeNavigation) / 1000);
      // await page.goto(url, { waitUntil: 'domcontentloaded' });

      console.log('goto ', url);

      await page.setViewport({ width: 1366, height: 1366 });

      if (url.includes("fanatics.com")) {
        const lastTimeBeforeHandleFanaticsLogic = Date.now();
        await handleFanaticsLogic(page, url, params, response);
        console.log('handleFanatics.com ', (Date.now() - lastTimeBeforeHandleFanaticsLogic) / 1000);
      }

      console.log('all good, so far');
      const lastTimeBeforeCapture = Date.now();
      await page.screenshot({ path: imagePath });
      console.log('screen captured', (Date.now() - lastTimeBeforeCapture) / 1000);

      if (response.status === "processing") {
        response.status = "success";
      }
      await page.close();
      page = null;
      const last = Date.now();
      await browser.close();
      browser = null;
      console.log('broswer close time', (Date.now() - last) / 1000);
      console.log('total time ', (Date.now() - lastTimeBeforeLauchBrowser) / 1000);
      res.send(response);
      console.log('ok, ');
    } catch (error) {
      console.error('API error:', error);
      res.send({
        status: "failed",
        image: "failed",
        error: error.message
      });
      console.log('nok');
    } finally {
      console.log('processing ended!');
      isProcessing = false;
    }
  });

  // Helper function to handle Fanatics-specific logic
  async function handleFanaticsLogic(page, url, params, response) {
    try {
      console.log('handleFanaticsLogic');

      const lastTimeBeforeSelectCard = Date.now();
      await page.waitForSelector('.no-results-container, .product-card', { timeout: 120000 });
      console.log('card selection time', (Date.now() - lastTimeBeforeSelectCard) / 1000);
      if (await page.$('.no-results-container')) {
        response.status = "search not found";
        throw new Error('search not found');
      }
      const restTime = Date.now();
      await page.waitForTimeout(100, 300);

      console.log('ok, loaded');

      params = params.split(",");
      let size = decodeURI(params[0]);
      console.log('rest time', (Date.now() - restTime) / 1000);
      const lastTimeBeforeDOM = Date.now();
      const productCard = await page.$('.product-card');
      console.log('dom selection time', (Date.now() - lastTimeBeforeDOM) / 1000);
      const lastTimeBeforeGetLink = Date.now();
      if (productCard) {
        const link = await productCard.$eval('a', (anchor) => anchor.href); // Extract the href attribute
        await page.setDefaultNavigationTimeout(1000000);
        // console.log('res===>', result.data);
        await page.goto(link, { waitUntil: 'domcontentloaded' });
      }
      else {
        console.log('oops, something went wrong!!!');
        throw new Error("oops");
      }
      console.log('nativation to item', (Date.now() - lastTimeBeforeGetLink) / 1000);
      if (size && typeof size !== 'undefined' && size !== 'undefined' && size !== '') {
        size = size.toLowerCase();
        if (size.startsWith('apple')) {
          size = size.replace('apple', '');
        }
        const lastTimeBeforeSize = Date.now();
        await page.waitForTimeout(100);
        const sizes = await page.$$("label.available");
        const unavailableSizes = await page.$$("label.unavailable");
        console.log('Size detection time', (Date.now() - lastTimeBeforeSize) / 1000);

        const sizesSimilar = await findVariant(page, size, sizes);
        const unavailableSizesSimilar = await findVariant(page, size, unavailableSizes);
        const hasFullySimilarUnavailable = unavailableSizesSimilar.find(item => item.similarity > 0.9);

        if (hasFullySimilarUnavailable || !sizesSimilar.length) {
          console.log('size=>', size);
          console.log('has fully similarUnavailable=>', hasFullySimilarUnavailable);
          console.log('has fully sizesimilar=>', sizesSimilar);
          response.status = "size not found";
        }
        console.log('total size detection time', (Date.now() - lastTimeBeforeSize) / 1000);
      } else {
        console.log('there is no specified size');
      }
    } catch (error) {
      if (error.message === 'search not found') {
        response.status = "search not found";
      } else if (error.message === "oops") {
        response.status = "something went wrong";
      }
      else {
        response.status = "failed";
      }
      console.error('Fanatics handling error:', error);
    }
  }
})();

// Making Express listen on port
const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Running on http://localhost:${PORT}.`);
});