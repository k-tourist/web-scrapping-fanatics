const sites = [
  {
    url: "https://www.fanatics.com/",
    query: "?query=",
    search: [
      "Michigan State Spartans Silicone AirPods Case - Green",
      "Michigan State Spartans Silicone AirPods Case - Black",
      "Michigan State Spartans Affinity Bands Debossed Silicone AirPods Case Cover - Green",
      "Michigan State Spartans Affinity Bands AirPods Pro Silicone Case Cover",
      "Michigan State Spartans Affinity Bands Debossed Silicone AirPods Pro Case Cover",
    ],
    result: `class="page-count"`,
  },
  {
    url: "https://www.target.com/",
    query: "s?searchTerm=",
    search: [
      "NCAA Michigan State Spartans Silicone Cover for Apple AirPod Battery Case",
      "NCAA Michigan State Spartans Apple AirPods Pro Compatible Silicone Battery Case Cover - Green",
      "NCAA Michigan State Spartans Silicone Apple Watch Band 38mm - Green",
      "NCAA Michigan State Spartans Silicone Apple Watch Band 42mm - Green",
    ],
    result: `data-test="resultsHeading"`,
  },
  {
    url: "https://www.bedbathandbeyond.com/",
    query: "store/s/",
    search: [
      "Michigan State University Silicone Cover for Apple AirPods Charging Case in Green",
      "Michigan State University Apple AirPod® Pro Silicone Case Cove",
    ],
    result: `class="resultCount"`,
  },
  {
    url: "https://www.shophq.com/",
    query: "search/?q=",
    search: [
      "GameTime NCAA Silicone Case Cover for Apple AirPods",
      "GameTime NCAA Silicone Strap for 38mm or 40mm Apple ® Watch",
      "GameTime NCAA Silicone Strap for 42mm or 44mm Apple ® Watch",
      "Officially Licensed NCAA Apple® AirPods Pro Silicone Case Cover & Carabiner",
    ],
    result: `class="breadcrumb"`,
  },
  {
    url: "https://hsn.com/",
    query: "search?query=",
    search: [
      "Officially Licensed NCAA Silicone Battery Case for Apple AirPod",
      "Officially Licensed NCAA Apple AirPods Pro Case Cover - Michigan State",
      "Officially Licensed NCAA 38/40mm Silicone Apple Watch Band - MI State",
      "Officially Licensed NCAA 42/44mm Silicone Apple Watch Band - Spartans",
    ],
    result: `class="search-results-msg"`,
  },
  {
    url: "https://www.hibbett.com/",
    query: "search?query=",
    search: [
      "C-125-AP1",
      "C-125-AP2",
      "C38-125-SW2",
      "C38-125-SW3",
      "C42-125-SW2",
    ],
    result: `class="breadcrumb"`,
  },
  {
    url: "https://www.belk.com/",
    query: "search/?q=",
    search: [
      "C-101-AP1",
      "C-101-AP2",
      "C38-101-SW2",
      "C38-101-SW4",
      "C42-101-SW2",
      "C42-101-SW4",
      "C-101-APP1",
      "C-QC1-101-20",
      "C-QC1-101-22",
    ],
    result: `class="search-result-data"`,
  },
  {
    url: "https://groupon.com/",
    query: "browse/chicago?query=",
    search: [
      "Affinity Bands NCAA Apple AirPod Silicone Case Covers",
      "Affinity Bands NCAA 38/40mm Apple Watch Silicone Band",
      "Game Time NCAA 42/44mm Apple Watch Silicone Band",
      "Affinity Bands NCAA Apple AirPods Pro Silicone Case Covers",
      "Affinity Bands NCAA Samsung Watch Silicone Band 20mm and 22mm",
    ],
    result: `class="cui-message"`,
  },
];

let resultTable = [];

const table = (data) => {
  const tableBody = document.querySelector("tbody");
  resultTable.push(data);

  resultTable.forEach((row) => {
    tableBody.innerHTML = `${tableBody.innerHTML}<tr><td>${row.url}</td><td>${row.search}</td><td><a href="${row.query}" target="_blank">${row.query}</a></td><td>${row.result}</td></tr>`;
  });
};

const message = (text) => {
  const results = document.querySelector(".results");
  results.innerHTML = `<p>${text}</p>${results.innerHTML}`;
};

const handleResponse = (response, site, search, query, result) => {
  if (response) {
    const template = document.createElement("template");
    template.innerHTML = response;
    const searcResult = template.content.querySelector(`[${result}]`);
    const resultText =
      searcResult && searcResult.textContent
        ? searcResult.textContent
        : "Nothing found";

    message(
      `Search for <strong>${search}</strong> on <strong>${site}</strong> <mark class="tertiary">succeeded</mark>. <em>${resultText}</em>.`
    );
    table({ url: site, search: search, query: query, result: resultText });
  } else {
    message(
      `Search for <strong>${search}</strong> on <strong>${site}</strong> <mark class="secondary">failed</mark>.`
    );
    table({ url: site, search: search, query: query, result: `failed` });
  }
};

// sites.forEach((site) => {
//   message(`Fetching <strong>${site.url}</strong>...`);

//   site.search.forEach((search) => {
//     message(
//       `Searching <strong>${site.url}</strong> for <strong>${search}</strong>...`
//     );

//     const query = site.url + site.query + encodeURIComponent(search);

//     const result = fetch("ajax.php", {
//       method: "POST",
//       headers: {
//         Accept: "application/json",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ url: query }),
//     })
//       .then((response) => response.text())
//       .then((text) =>
//         handleResponse(text, site.url, search, query, site.result)
//       );
//   });
// });
