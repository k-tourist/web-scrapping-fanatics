require("dotenv").config();
const express = require("express"); // Adding Express
const app = express(); // Initializing Express
const path = require("path");
// const bodyParser = require("body-parser");
// const puppeteer = require("puppeteer"); // Adding Puppeteer
// const { Cluster } = require("puppeteer-cluster");
const puppeteer = require("puppeteer-extra");
const PluginStealth = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
// const { chromium } = require("playwright");
const fs = require("fs");
const fileUpload = require("express-fileupload");
var bodyParser = require("body-parser");
var stringSimilarity = require("string-similarity");
const randomUserAgent = require('random-useragent');

const targetHelpers = require("./scrappers/target_com/helpers.js")


app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function CSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = strDelimiter || ",";

  // Create a regular expression to parse the CSV values.
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

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);
    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
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
  //console.log("saving csv");
  // const csv = JSON.stringify(req.body);
  // console.log(req.body);
  let lineArray = [];
  req.body.forEach(function (infoArray) {
    let line = infoArray.join(",");
    lineArray.push(line);
  });
  let csvContent = lineArray.join("\n");
  // console.log(csvContent);

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
  //console.log("saving csv");
  // const csv = JSON.stringify(req.body);
  // console.log(req.body);
  let lineArray = [];
  req.body.forEach(function (infoArray) {
    let line = infoArray.join(",");
    lineArray.push(line);
  });
  let csvContent = lineArray.join("\n");
  // console.log(csvContent);

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
  //console.log("uploading");
  const csv = req.files.csv.data;
  const csvArray = CSVToArray(csv, ",");
  // console.log(csvArray);

  res.send(csvArray);

  // fs.writeFile(path.join(__dirname + "/sites.json"), sites, function (err) {
  //   if (err) throw err;
  //   res.send("saved");
  // });
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

    if (parseFloat(sizeSimilarity) > 0.7) {
      sizesSimilar.push({
        value: sizeValue,
        similarity: sizeSimilarity
      });
    }
  }

  return sizesSimilar;
}

(async function () {
  let browser;
  let page;
  // const [page] = await browser.pages();
  let chain = Promise.resolve();

  app.post("/start", async function (req, res) {
    console.log("browser started");
    // await browser.close();

    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    // await page.setDefaultNavigationTimeout(0);

    res.send("restarted");
  });

  app.post("/stop", async function (req, res) {
    console.log("browser stopped");
    await browser.close();

    res.send("stopped");
  });

  // Wrapping the Puppeteer browser logic in a POST request
  app.post("/api", function (req, res) {
    //console.log("calling api");
    const restart = req.body.restart;
    // const selector = req.body.selector;
    let url = req.body.url;
    let params = req.body.params;
    const uid = url.replace(/[^a-zA-Z0-9]/g, "");
    const imagePath = path.join(__dirname + `/public/screenshots/${uid}.png`);
    let response = {
      status: "processing",
      image: `${uid}.png?v=${Date.now()}`,
    };

    chain = chain.then(async () => {
      try {
        // await page.setRequestInterception(true);

        // page.on("request", (request) => {
        //   if (
        //     request.isNavigationRequest() &&
        //     request.redirectChain().length !== 0
        //   ) {
        //     request.abort();
        //   } else {
        //     request.continue();
        //   }
        // });

        // if (restart == 1) {
        //   await browser.close();

        //   browser = await puppeteer.launch({
        //     headless: false,
        //     args: ["--no-sandbox", "--disable-setuid-sandbox"],
        //   });
        //   page = await browser.newPage();
        // }
        console.log('goto');

        await page.setDefaultNavigationTimeout(0);

        // replace dash for target
        if (url.includes('target.com') && url.includes('%2B-%2B')) {
          url = url.replace('%2B-%2B', ' ')
        }

        console.log('url', url)

        if (url.includes('target.com')) {
          const userAgent = randomUserAgent.getRandom(targetHelpers.filterUserAgents);
          await page.setUserAgent(userAgent);

          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
          });          
        }

        await page.goto(url, { waitUntil: "load" });

        console.log('waiting');

        await page.setViewport({ width: 1366, height: 1366 });

        // await page.setUserAgent(
        //   "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
        // );

        // if (params) {
        //   console.log(params);
        // }

        if (url.includes("hsn.com")) {
          try {
            await page.waitForSelector("#closeModal", {
              timeout: 1500,
            });
            await page.click("#closeModal", {
              timeout: 1500,
            });
          } catch (error) {
            // console.log("The popup didn't appear.");
          }

          if (params) {
            try {
              const [button] = await page.$x(
                "//a[@class='btn-styled']/span[contains(., '" +
                  decodeURI(params) +
                  "')]"
              );

              if (button) {
                await Promise.all([
                  await button.click(),
                  page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
              }
            } catch (error) {
              response.status = "team not found";
              // console.log("The team didn't appear.");
            }
          }

          // search result check
          try {
            await page.waitForSelector(".search-no-results", {
              timeout: 1500,
            });
            response.status = "search not found";
          } catch (error) {
            // response.status = "search not found";
          }
        }

        if (url.includes("belk.com")) {
          try {
            await page.waitForSelector("#monetate_lightbox_mask", {
              timeout: 1500,
            });
            await page.click("#monetate_lightbox_mask", {
              timeout: 1500,
            });
          } catch (error) {
            // console.log("The popup didn't appear.");
          }

          // search result check
          // try {
          //   await page.waitForSelector(".product-image", {
          //     timeout: 1500,
          //   });
          // } catch (error) {
          //   response.status = "search not found";
          // }

          async function checkSku() {
            // check sku
            try {
              const sku = `0${url.replace(
                "https://www.belk.com/search/?q=",
                ""
              )}`;
              let scripts = false;

              const getData = async () => {
                return await page.evaluate(async () => {
                  return await new Promise((resolve) => {
                    setTimeout(() => {
                      let elements = document.querySelectorAll("head script");
                      let texts = [];

                      elements.forEach((element) => {
                        texts.push(element.innerText);
                      });

                      resolve(texts);
                    }, 1500);
                  });
                });
              };

              scripts = await getData();

              let data = "{'sku_upc':[]}";

              scripts.forEach((script) => {
                if (script.includes("var utag_data = ")) {
                  data = script.replace("var utag_data = ", "");
                  data = data.replace(/\s/g, "");
                  data = data.slice(0, -1);
                }
              });

              data = JSON.parse(data);

              // console.log(data.sku_upc, sku, data.sku_upc.includes(sku));

              if (!data.sku_upc.includes(sku)) {
                response.status = "sku not found";
              }
            } catch (error) {
              response.status = "sku not found";
            }
          }

          // navigate to first item
          try {
            await page.waitForSelector("a.thumb-link", {
              timeout: 1500,
            });

            await Promise.all([
              await page.click("a.thumb-link"),
              page.waitForNavigation({ waitUntil: "networkidle0" }),
            ]);

            await checkSku();
          } catch (error) {
            await checkSku();
          }
        }

        if (url.includes("groupon.com")) {
          try {
            await page.waitForSelector("#nothx", {
              timeout: 1500,
            });
            await page.click("#nothx", {
              timeout: 1500,
            });
          } catch (error) {
            // console.log("The popup didn't appear.");
          }

          if (params) {
            params = params.split(",");
            team = decodeURI(params[0]);
            size = decodeURI(params[1]);

            if (team) {
              try {
                const option = (
                  await page.$x(
                    '//*[@id = "trait-0"]/option[text() = "' + team + '"]'
                  )
                )[0];
                const value = await (
                  await option.getProperty("value")
                ).jsonValue();

                await page.select("#trait-0", value);

                if (size) {
                  try {
                    const option = (
                      await page.$x(
                        '//*[@id = "trait-1"]/option[text() = "' + size + '"]'
                      )
                    )[0];
                    const value = await (
                      await option.getProperty("value")
                    ).jsonValue();

                    await page.select("#trait-1", value);
                  } catch (error) {
                    response.status = "size not found";
                    // console.log("The size didn't appear.");
                  }
                }
              } catch (error) {
                response.status = "team not found";
                // console.log("The team didn't appear.");
              }
            }
          }

          // search result check
          try {
            await page.waitForSelector(".deal-page-title", {
              timeout: 1500,
            });
          } catch (error) {
            response.status = "search not found";
          }
        }

        if (url.includes("fanatics.com")) {
          console.log('try fanatics');

          // search result check
          try {
            console.log('try fanatics search');

            const search = decodeURIComponent(
              url.replace("https://www.fanatics.com/?query=", "")
            );

            // if (params) {
            //   params = params.split(",");
            //   const size = decodeURI(params[0]);
            // }

            // await page.waitForSelector(".modal-close-button", {
            //   timeout: 1500,
            // });

            // await page.click(".modal-close-button", {
            //   timeout: 1500,
            // });

            // await page.waitForSelector(".product-card-title a", {
            //   timeout: 1500,
            // });

            // await page.click(".product-card-title a", {
            //   timeout: 1500,
            // });

            // await page.waitForSelector(".product-card-title a[contains(., " + search + ")]", {
            //   timeout: 1500,
            // });

            // await page.waitForXPath("//.product-card-title a[contains(., " + search + ")]", {
            //   timeout: 1500,
            // });

            // const elements = await page.$x("//.product-card-title a[contains(., " + search + ")]");

            // let elements = await page.$$(".product-card-title a");
            // let found = false;
            // let val = "";
            // let similar = [];

            // for (var i = 0; i < elements.length; i++) {
            //   let value = await page.evaluate(
            //     (el) => el.textContent,
            //     elements[i]
            //   );

            //   const searchTitle = search
            //     .trim()
            //     .replace("Sc ", "")
            //     .replace("SC ", "")
            //     .replace("Fc ", "")
            //     .replace("FC ", "")
            //     .replace("LAFC ", "")
            //     .replace("Lafc ", "")
            //     .toLowerCase();

            //   const valueTitle = value
            //     .trim()
            //     .replace("Sc ", "")
            //     .replace("SC ", "")
            //     .replace("Fc ", "")
            //     .replace("FC ", "")
            //     .replace("LAFC ", "")
            //     .replace("Lafc ", "")
            //     .replace("Team Color ", "")
            //     .toLowerCase();

            //   let firstWord = searchTitle.split(" ");

            //   if (firstWord[0].trim().toLowerCase() == "dc") {
            //     firstWord[0] = "D.C.";
            //   }

            //   let similarity = stringSimilarity.compareTwoStrings(
            //     valueTitle,
            //     searchTitle
            //   );

            //   // && !valueTitle.includes(" - ")  && valueTitle.includes(firstWord[0].toLowerCase()
            //   // console.log('compare', similarity, valueTitle, searchTitle)
            //   if (parseFloat(similarity) > 0.7 && valueTitle.includes(firstWord[0].toLowerCase()) ) {
            //     // console.log([similarity, valueTitle, searchTitle]);
            //     found = "similar";
            //     val = value.trim();
            //     similar.push({
            //       index: i,
            //       value: val,
            //       similarity: similarity
            //     });
            //   }

            //   // if (value.trim().toLowerCase() === search.trim().toLowerCase()) {
            //   //   found = true;

            //   //   similar.push({
            //   //     index: i,
            //   //     value: value.trim(),
            //   //     similarity: 1
            //   //   })

            //   //   break;
            //   // }
            // }

            // let sorted = similar.sort((a,b) => b.similarity - a.similarity);

            // console.log(sorted, 'sims');

            // if (found === false) {
            //   response.status = "search not found";
            // }

            // if (found === "similar") {
            //   response.status = val;
            // }

            // response.status = "found";

            params = params.split(",");
            let size = decodeURI(params[0]);
            console.log(params, size, 'size')

            if (size && typeof size != 'undefined' && size != 'undefined' && size != '') {
              size = size.toLowerCase();
              try {
                let isModal = (await page.$('.modal-close-button')) || "";
                console.log('modalll???')
                if (isModal) {
                  await page.click(".modal-close-button", {
                    timeout: 1500,
                  });
                  console.log('click modal?')
                }

                await Promise.all([
                  page.click('.product-card-title a'),
                  page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                console.log('click title?')
                await page.waitForTimeout(randomNumber(2000, 5000));

                let sizes = await page.$$("label.available");
                let unavailableSizes = await page.$$("label.unavailable");

                let sizesSimilar = await findVariant(page, size, sizes);
                let unavailableSizesSimilar = await findVariant(page, size, unavailableSizes);
                const hasFullySimilarUnavailable = unavailableSizesSimilar.find(item => item.similarity > 0.9);
                let sizesSorted = sizesSimilar.sort((a,b) => b.similarity - a.similarity);

                console.log(sizesSorted, 'sizesim')

                if (hasFullySimilarUnavailable || !sizesSimilar.length) {
                  response.status = "size not found";

                  // if (unavailableSizesSimilar.length) {
                  //   response.status = "size not available";
                  // }
                }
              } catch (error) {
                response.status = "size not found";
              }
            } else {
              try {
                let isModal = (await page.$('.modal-close-button')) || "";
                console.log('modalll???')
                if (isModal) {
                  await page.click(".modal-close-button", {
                    timeout: 1500,
                  });
                  console.log('click modal?')
                }

                await Promise.all([
                  page.click('.product-card-title a'),
                  page.waitForNavigation({ waitUntil: "networkidle0" }),
                ]);
                console.log('click title?')
                await page.waitForTimeout(randomNumber(2000, 5000));

                if (size) {
                  let sizes = await page.$$("label.available");
                  let unavailableSizes = await page.$$("label.unavailable");
                  let sizesSimilar = await findVariant(page, size, sizes);
                  let unavailableSizesSimilar = await findVariant(page, size, unavailableSizes);
                  const hasFullySimilarUnavailable = unavailableSizesSimilar.find(item => item.similarity > 0.9);

                  let sizesSorted = sizesSimilar.sort((a,b) => b.similarity - a.similarity);

                  console.log(sizesSorted, 'sizesim')
  
                  if (hasFullySimilarUnavailable || !sizesSimilar.length) {
                    response.status = "size not found";
  
                    // if (unavailableSizesSimilar.length) {
                    //   response.status = "size not available";
                    // }
                  }
                } else {
                  console.log('success for no size');
                }
              } catch (error) {
                response.status = "size not found";
              }
            }
          } catch (error) {
            console.log('fanatics search failed');
            response.status = "search not found";
          }
        }

        if (url.includes("bedbathandbeyond.com")) {
          //console.log("bedbathandbeyond");
          // search result check
          try {
            // await page.exposeFunction("getItem", function (a) {
            //   console.log(a);
            // });

            // await page.evaluate(() => {
            //   var observer = new MutationObserver((mutations) => {
            //     for (var mutation of mutations) {
            //       if (mutation.addedNodes.length) {
            //         getItem(mutation.addedNodes[0].innerText);
            //       }
            //     }
            //   });
            //   observer.observe(document.querySelector("body"), {
            //     attributes: false,
            //     childList: true,
            //     subtree: true,
            //   });
            // });

            await page.waitForSelector("#filters-paging-h2", {
              timeout: 1500,
            });
          } catch (error) {
            response.status = "search not found";
          }
        }

        if (url.includes("shophq.com")) {
          // search result check
          try {
            await page.waitForSelector(".search-product-detail-container", {
              timeout: 1500,
            });
          } catch (error) {
            response.status = "search not found";
          }

          // navigate to single page
          try {
            await page.waitForSelector(".BrowseProducts-caption a", {
              timeout: 1500,
            });

            await Promise.all([
              page.click(".BrowseProducts-caption a"),
              page.waitForNavigation({ waitUntil: "networkidle0" }),
            ]);
          } catch (error) {
            response.status = "search not found";
          }

          // params
          if (params) {
            try {
              await page.waitForSelector(
                'li.color-box-container img[title="' +
                  params.toUpperCase() +
                  '"]',
                {
                  timeout: 1500,
                }
              );

              await page.click(
                'li.color-box-container img[title="' +
                  params.toUpperCase() +
                  '"]',
                {
                  timeout: 1500,
                }
              );

              await page.waitForTimeout(randomNumber(2000, 5000));
            } catch (error) {
              response.status = "team not found";
              // console.log("The team didn't appear.");
            }
          }
        }

        if (url.includes("hibbett.com")) {
          // search result check
          try {
            await page.waitForSelector(".product-name", {
              timeout: 1500,
            });
          } catch (error) {
            response.status = "search not found";
          }
        }

        if (url.includes("target.com")) {
          console.log('target')
          // search result check
          try {
            await page.waitForSelector(
              "section",
              {
                timeout: 6000,
              }
            );

            // search result check
            try {
              let search = decodeURIComponent(
                url.replace("https://www.target.com/s?searchTerm=", "")
              );

              search = search.split("+").join(" ");

              if (search.includes(' - ')) {
                search = search.replace(' - ', ' ')
              }

              await page.waitForSelector(
                targetHelpers.getSearchResultLinkSelector(),
                {
                  timeout: 6000,
                }
              );

              let targetLinks = await page.$$(targetHelpers.getRelatedSearchResultLinkSelector());

              if (targetLinks?.length) {
                try {
                  const rect = await page.evaluate((targetLink) => {
                    const {top, left, bottom, right, width, height} = targetLink.getBoundingClientRect();
                    return {top, left, bottom, right, width, height};
                  }, targetLinks[0]);
                  const x = rect.left + (rect.width / randomNumber(2, 20))
                  const y = rect.top + (rect.height / randomNumber(2, 20))
                  await page.mouse.move(x, y);
                  await page.mouse.click(x, y);
                  await page.waitForNavigation({ waitUntil: "load" })
                } catch(err) {
                  console.log('Failed to move mouse and click', err);
                }

                // await Promise.all([
                //   page.click(targetHelpers.getRelatedSearchResultLinkSelector(search)),
                //   page.waitForNavigation({ waitUntil: "networkidle0" }),
                // ]);
                    
                await page.waitForTimeout(randomNumber(2000, 5000));

                try {
                  // single product type
                  const noAvailableSelector = 'div[data-test="productNotFound"]';
                  const soldOutBlockSelector = 'div[data-test="soldOutBlock"]';
                  const addToCartButtonSelector = '[data-test="shippingButton"]';
                  
                  let noAvailablebanner = await page.$$(noAvailableSelector);
                  let soldOutBlock = await page.$$(soldOutBlockSelector);
                  let addToCartButton = await page.$$(addToCartButtonSelector);

                  if (noAvailablebanner.length || soldOutBlock.length) {
                    // single product not found or variable product not available
                    found = false;
                  } else if (addToCartButton.length) {
                    found = true;
                    // try find target option
                    // const targetOptionSelector = '[data-test="@web/VariationComponent"] a[value^="' + params.trim() + '"]';
                        
                    // await page.waitForSelector(
                    //   targetOptionSelector,
                    //   {
                    //     timeout: 6000,
                    //   }
                    // );

                    // await page.waitForTimeout(randomNumber(2000, 5000));
                          
                    // await page.click(
                    //   targetOptionSelector,
                    //   {
                    //     timeout: 3000,
                    //   }
                    // );

                    // const r = await page.$eval(targetOptionSelector, (el) => el.getAttribute("value"));

                    // console.log('r', r, params.trim())

                    // // TODO: check out of stock status
                    // if (r.includes('Out of Stock')) {
                    //   found = false;
                    // } else {
                    //   found = true;
                    // }
                  } else {
                    found = false;
                  }
                } catch(err) {
                  console.error('Faild find target option: ', err)
                  found = false;
                }
              } else {                
                found = false;
              }

              if (found === false) {
                response.status = "search not found";
              }
            } catch (error) {
              response.status = "search not found";
            }
          } catch (error) {
            response.status = "search not found";
          }
        }

        await page.screenshot({
          path: imagePath,
        });

        // await page.close();

        // await browser.close();

        if (response.status === "processing") {
          response.status = "success";
        }

        res.send(response);
      } catch (error) {
        console.error(error);
        res.send({
          status: "failed",
          image: "failed",
        });
      }
    });
  });
})();

// Making Express listen on port
const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Running on http://localhost:${PORT}.`);
});
