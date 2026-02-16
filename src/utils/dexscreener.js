export const generateDexScreenerUrl = (filters) => {
    const baseUrl = "https://dexscreener.com/solana"; // Defaulting to solana path context, or generic?
    // DexScreener URLs are often https://dexscreener.com/solana?rankBy=... or https://dexscreener.com/?rankBy=... 
    // If specific chain is selected, it might be /chainName. 
    // But the python script used https://dexscreener.com/?... with chainIds param.
    // Let's stick to the query params approach which is most robust for filters.

    let url = "https://dexscreener.com/new-pairs";
    // The scraper uses base_url = "https://dexscreener.com/" then appends query string.
    // However, for "New Pairs" specifically, it's often /new-pairs key. 
    // But if we are just filtering, the root / matches "All" usually.
    // Let's match the Python script: base_url = "https://dexscreener.com/"

    const params = new URLSearchParams();

    // Helper to add if exists
    const add = (key, val) => {
        if (val !== undefined && val !== null && val !== '') {
            params.append(key, val);
        }
    };

    add('rankBy', filters.rankBy);
    add('order', filters.order);
    add('chainIds', filters.chainIds);
    add('dexIds', filters.dexIds);

    // Liquidity
    add('minLiq', filters.minLiq);
    add('maxLiq', filters.maxLiq);

    // Market Cap
    add('minMarketCap', filters.minMarketCap);
    add('maxMarketCap', filters.maxMarketCap);

    // FDV
    add('minFdv', filters.minFdv);
    add('maxFdv', filters.maxFdv);

    // Age
    add('minAge', filters.minAge);
    add('maxAge', filters.maxAge);

    // Txns
    add('min24HTxns', filters.min24HTxns); add('max24HTxns', filters.max24HTxns);
    add('min6HTxns', filters.min6HTxns); add('max6HTxns', filters.max6HTxns);
    add('min1HTxns', filters.min1HTxns); add('max1HTxns', filters.max1HTxns);
    add('min5MTxns', filters.min5MTxns); add('max5MTxns', filters.max5MTxns);

    // Buys
    add('min24HBuys', filters.min24HBuys); add('max24HBuys', filters.max24HBuys);
    add('min6HBuys', filters.min6HBuys); add('max6HBuys', filters.max6HBuys);
    add('min1HBuys', filters.min1HBuys); add('max1HBuys', filters.max1HBuys);
    add('min5MBuys', filters.min5MBuys); add('max5MBuys', filters.max5MBuys);

    // Sells
    add('min24HSells', filters.min24HSells); add('max24HSells', filters.max24HSells);
    add('min6HSells', filters.min6HSells); add('max6HSells', filters.max6HSells);
    add('min1HSells', filters.min1HSells); add('max1HSells', filters.max1HSells);
    add('min5MSells', filters.min5MSells); add('max5MSells', filters.max5MSells);

    // Volume
    add('min24HVol', filters.min24HVol); add('max24HVol', filters.max24HVol);
    add('min6HVol', filters.min6HVol); add('max6HVol', filters.max6HVol);
    add('min1HVol', filters.min1HVol); add('max1HVol', filters.max1HVol);
    add('min5MVol', filters.min5MVol); add('max5MVol', filters.max5MVol);

    // Change
    add('min24HChg', filters.min24HChg); add('max24HChg', filters.max24HChg);
    add('min6HChg', filters.min6HChg); add('max6HChg', filters.max6HChg);
    add('min1HChg', filters.min1HChg); add('max1HChg', filters.max1HChg);
    add('min5MChg', filters.min5MChg); add('max5MChg', filters.max5MChg);

    // Toggles
    if (filters.profile) params.append('profile', '1');
    if (filters.boosted) params.append('boosted', '1');
    // Ads not standard param? assuming check box logic handled it in scraper or we ignore.

    // Construct final URL
    // If chainIds provided, typically DexScreener might assume global filter.
    // Let's use the root with query params.
    return `https://dexscreener.com/?${params.toString()}`;
};
