module.exports = {
    isProductInSearchResults: async (productId, page, element) => {
        let linkUrl = await page.evaluate(
            (el) => el.getAttribute("href"),
            element
        )
    
        return linkUrl.includes(productId);
    },
    getSearchResultLinkSelector: (index = null) => {
        if (index !== null) {
            return "div[data-test='@web/ProductCard/ProductCardVariantDefault']:nth-child(" + index + ") a"
        }
    
        return "div[data-test='@web/ProductCard/ProductCardVariantDefault'] a";
    },
    getRelatedSearchResultLinkSelector: () => {
        return `a[data-test="product-title"]`;
    },
    filterUserAgents: (userAgent) => {
        const minVersions = {
            "Chrome": 79,
            "Firefox": 72,
            "Opera": 67,
            "Safari": 13.1,
            "Edge": 79,
            "Vivaldi": 2.10,
            "Yandex": 20.4,
            "Samsung Browser": 11.1,
            "Mobile Safari": 13.1,
            "Opera Mini": 50,
            "Opera Mobi": 66,
            "Chromium": 79,
            "PaleMoon": 28.15,
            "SeaMonkey": 2.53,
            "Fennec": 68.11
        };

        const { browserName, browserVersion } = userAgent;
        const minVersion = minVersions[browserName];
        
        if (!minVersion) return false;
        
        const currentVersion = parseFloat(browserVersion);
        return currentVersion >= minVersion;
    }
}