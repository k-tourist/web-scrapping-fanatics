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
    console.log('api invoked');
    let browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    let page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
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

    isProcessing = true;
    const { url, params } = req.body;
    const uid = url.replace(/[^a-zA-Z0-9]/g, "");
    const imagePath = path.join(__dirname, `/public/screenshots/${uid}.png`);

    let response = {
      status: "processing",
      image: `${uid}.png?v=${Date.now()}`,
    };

    try {
      // Reset navigation timeout for this request
      await page.setDefaultNavigationTimeout(30000);

      if (url.includes('target.com') && url.includes('%2B-%2B')) {
        url = url.replace('%2B-%2B', ' ');
      }

      if (url.includes('target.com')) {
        const userAgent = randomUserAgent.getRandom(targetHelpers.filterUserAgents);
        await page.setUserAgent(userAgent);
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'DNT': '1',
        });
      }

      await page.goto(url, {
        waitUntil: "load",
        timeout: 30000
      });

      console.log('goto ', url);

      await page.setViewport({ width: 1366, height: 1366 });

      if (url.includes("fanatics.com")) {
        await handleFanaticsLogic(page, url, params, response);
      }

      console.log('all good, so far');
      await page.screenshot({ path: imagePath });
      console.log('screen captured');

      if (response.status === "processing") {
        response.status = "success";
      }
      await page.close();
      page = null;
      await browser.close();
      browser = null;

      res.send(response);
      console.log('ok, ');
    } catch (error) {
      console.error('API error:', error);
      await page.close();
      page = null;
      await browser.close();
      browser = null;

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

      await page.waitForSelector('#typeahead-input-desktop', { timeout: 15000 });
      console.log('found search bar!');
      await page.waitForSelector('.global-footer-main', { timeout: 15000 });
      console.log('found footer!');

      console.log('full loaded');
      params = params.split(",");
      let size = decodeURI(params[0]);

      await page.waitForTimeout(3000); //wait for modal

      const isModal = await page.$('.modal-close-button');
      if (isModal) {
        await page.click(".modal-close-button", { timeout: 1500 });
      }

      // await Promise.all([
      //   page.click('.product-card-title a'),
      //   page.waitForNavigation({ waitUntil: "networkidle0" })
      // ]);
      // console.log('product card-title clicked');

      const productCard = await page.$('.product-card-title a');
      if (productCard) {
        const box = await productCard.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          console.log('Product card-title clicked with mouse');
        } else {
          console.log('Bounding box not found for product-card-title');
          throw new Error('Box not found');
        }
      } else {
        console.log('Product card-title not found');
        response.status = 'search not found';
        throw new Error('search not found');
      }

      await page.waitForNavigation({ waitUntil: "networkidle0" });

      await page.waitForTimeout(randomNumber(2000, 5000));

      if (size && typeof size !== 'undefined' && size !== 'undefined' && size !== '') {
        size = size.toLowerCase();
        const sizes = await page.$$("label.available");
        const unavailableSizes = await page.$$("label.unavailable");

        const sizesSimilar = await findVariant(page, size, sizes);
        const unavailableSizesSimilar = await findVariant(page, size, unavailableSizes);
        const hasFullySimilarUnavailable = unavailableSizesSimilar.find(item => item.similarity > 0.9);

        if (hasFullySimilarUnavailable || !sizesSimilar.length) {
          console.log('size=>', size);
          console.log('has fully similarUnavailable=>', hasFullySimilarUnavailable);
          console.log('has fully sizesimilar=>', sizesSimilar);
          response.status = "size not found";
        }
      } else {
        console.log('there is no specified size');
      }
    } catch (error) {
      console.error('Fanatics handling error:', error);
      response.status = "search not found";
    }
  }
})();

// Making Express listen on port
const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Running on http://localhost:${PORT}.`);
});
