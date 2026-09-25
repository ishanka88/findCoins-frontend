export const generateGeckoTerminalUrl = (filters = {}) => {
    const networkMap = {
        'solana': 'solana',
        'base': 'base',
        'bsc': 'bsc',
        'ethereum': 'eth',
        'polygon': 'polygon_pos',
        'arbitrum': 'arbitrum',
        'avalanche': 'avax',
        'sui': 'sui',
        'tron': 'tron',
        'optimism': 'optimism',
        'ton': 'ton'
    };

    const sortMap = {
        'trendingScoreM5': '5m_trend_score',
        'trendingScoreH1': '1h_trend_score',
        'trendingScoreH6': '6h_trend_score',
        'trendingScoreH24': '24h_trend_score',
        '5m': '5m_trend_score',
        '1h': '1h_trend_score',
        '6h': '6h_trend_score',
        '24h': '24h_trend_score',
        'volume': 'volume_24h'
    };

    const chainId = (filters.chainIds || 'solana').toLowerCase().split(',')[0].trim();
    const network = networkMap[chainId] || 'solana';

    const rankBy = filters.rankBy || 'trendingScoreH6';
    const baseSort = sortMap[rankBy] || '6h_trend_score';
    const order = (filters.order || 'desc').toLowerCase().trim();
    const sortParam = order === 'asc' ? baseSort : `-${baseSort}`;

    const params = new URLSearchParams();
    params.set('sort', sortParam);

    if (filters.minMarketCap) params.set('mc_in_usd[gte]', filters.minMarketCap);
    if (filters.maxMarketCap) params.set('mc_in_usd[lte]', filters.maxMarketCap);
    if (filters.min24HVol) params.set('volume_24h[gte]', filters.min24HVol);
    if (filters.max24HVol) params.set('volume_24h[lte]', filters.max24HVol);
    if (filters.minLiq) params.set('liquidity[gte]', filters.minLiq);
    if (filters.maxLiq) params.set('liquidity[lte]', filters.maxLiq);
    if (filters.minFdv) params.set('fdv_in_usd[gte]', filters.minFdv);
    if (filters.maxFdv) params.set('fdv_in_usd[lte]', filters.maxFdv);
    return `https://www.geckoterminal.com/${network}/pools?${params.toString()}`;
};
