import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { generateDexScreenerUrl } from './utils/dexscreener';
import { generateGeckoTerminalUrl } from './utils/geckoterminal';
import { X, Check, Save, ExternalLink, ChevronUp } from 'lucide-react';

// ... (in component)

// Output functions removed

// ... (render)



// --- DATA CONSTANTS ---
const PLATFORMS = [
    { id: 'solana', name: 'Solana', icon: 'https://dd.dexscreener.com/ds-data/chains/solana.png' },
    { id: 'base', name: 'Base', icon: 'https://dd.dexscreener.com/ds-data/chains/base.png' },
    { id: 'bsc', name: 'BSC', icon: 'https://dd.dexscreener.com/ds-data/chains/bsc.png' },
    { id: 'ethereum', name: 'Ethereum', icon: 'https://dd.dexscreener.com/ds-data/chains/ethereum.png' },
    { id: 'polygon', name: 'Polygon', icon: 'https://dd.dexscreener.com/ds-data/chains/polygon.png' },
    { id: 'arbitrum', name: 'Arbitrum', icon: 'https://dd.dexscreener.com/ds-data/chains/arbitrum.png' },
    { id: 'avalanche', name: 'Avalanche', icon: 'https://dd.dexscreener.com/ds-data/chains/avalanche.png' },
    { id: 'sui', name: 'Sui', icon: 'https://dd.dexscreener.com/ds-data/chains/sui.png' },
    { id: 'tron', name: 'Tron', icon: 'https://dd.dexscreener.com/ds-data/chains/tron.png' },
    { id: 'optimism', name: 'Optimism', icon: 'https://dd.dexscreener.com/ds-data/chains/optimism.png' },
    { id: 'ton', name: 'TON', icon: 'https://dd.dexscreener.com/ds-data/chains/ton.png' },
    // Add more as needed, but this covers the majors + screen shot examples
];

const DEXES = [
    { id: 'raydium', name: 'Raydium' },
    { id: 'orca', name: 'Orca' },
    { id: 'pumpfun', name: 'Pump.fun' },
    { id: 'meteora', name: 'Meteora' },
    { id: 'jupiter', name: 'Jupiter' },
    { id: 'fluxbeam', name: 'FluxBeam' },
    { id: 'pumpswap', name: 'PumpSwap' },
    { id: 'bags', name: 'Bags' },
    { id: 'moonit', name: 'Moonit' },
];

// --- SUB-COMPONENT: Selection Modal ---
const SelectionModal = ({ title, options, selected, onToggle, onClose }) => (
    <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
        background: '#121214', display: 'flex', flexDirection: 'column'
    }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a2d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                    onClick={() => selected.length === 0 ? null : onToggle('CLEAR_ALL')} // Logic handled in parent wrapper if needed, here simplified
                    style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1px solid #333',
                        background: selected.length === 0 ? 'white' : 'transparent',
                        color: selected.length === 0 ? 'black' : 'white',
                        fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    {selected.length === 0 && <Check size={14} style={{ marginRight: 6 }} />} All
                </button>
                {options.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => onToggle(opt.id)}
                        style={{
                            padding: '8px 16px', borderRadius: '8px',
                            border: selected.includes(opt.id) ? '1px solid #333' : '1px solid #333',
                            background: selected.includes(opt.id) ? '#2a2a2d' : 'transparent',
                            color: 'white',
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                        }}
                    >
                        {selected.includes(opt.id) && <Check size={14} color="#00C6FF" />}
                        {opt.icon && <img src={opt.icon} width={20} height={20} style={{ borderRadius: '50%' }} alt="" />}
                        {opt.name}
                    </button>
                ))}
            </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2d', display: 'flex', justifyContent: 'center' }}>
            <button onClick={onClose} className="btn-primary" style={{ padding: '10px 40px' }}>Save</button>
        </div>
    </div>
);

// Re-use FilterRow
const ValuePreview = ({ value }) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num)) return null;

    const formatted = num.toLocaleString();
    const short = num >= 1_000_000_000 ? `${(num / 1_000_000_000).toFixed(2)}B` :
        num >= 1_000_000 ? `${(num / 1_000_000).toFixed(2)}M` :
            num >= 1_000 ? `${(num / 1_000).toFixed(1)}K` :
                num.toString();

    return (
        <div style={{
            fontSize: '0.65rem', color: '#00C6FF', marginTop: '4px',
            background: 'rgba(0,198,255,0.05)', padding: '2px 6px', borderRadius: '4px',
            display: 'inline-block', position: 'absolute', left: 0, top: '100%', zIndex: 10
        }}>
            {formatted} <span style={{ color: '#f59e0b', fontWeight: 600 }}>({short})</span>
        </div>
    );
};

const FilterRow = ({ label, minName, maxName, prefix = "", suffix = "", formData, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '22px' }}>
        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#ccc', fontWeight: 500 }}>{label}:</div>
        <div style={{ position: 'relative' }}>
            {prefix && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '0.8rem' }}>{prefix}</span>}
            <input
                type="number"
                name={minName}
                value={formData[minName]}
                onChange={onChange}
                placeholder="Min"
                style={{
                    width: '100%', padding: '8px 10px', paddingLeft: prefix ? '25px' : '10px',
                    background: '#1e1e20', border: '1px solid #333', borderRadius: '6px',
                    color: 'white', fontSize: '0.9rem', outline: 'none'
                }}
            />
            <ValuePreview value={formData[minName]} />
        </div>
        <div style={{ position: 'relative' }}>
            {prefix && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '0.8rem' }}>{prefix}</span>}
            <input
                type="number"
                name={maxName}
                value={formData[maxName]}
                onChange={onChange}
                placeholder="Max"
                style={{
                    width: '100%', padding: '8px 10px', paddingLeft: prefix ? '25px' : '10px',
                    background: '#1e1e20', border: '1px solid #333', borderRadius: '6px',
                    color: 'white', fontSize: '0.9rem', outline: 'none'
                }}
            />
            <ValuePreview value={formData[maxName]} />
            {suffix && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '0.8rem' }}>{suffix}</span>}
        </div>
    </div>
);

export function CreateStrategyModal({ onClose, onCreated, initialData = null }) {
    const [loading, setLoading] = useState(false);

    // Modal Visibility State
    const [showPlatformModal, setShowPlatformModal] = useState(false);
    const [showDexModal, setShowDexModal] = useState(false);

    // Selection State
    const [selectedPlatforms, setSelectedPlatforms] = useState(['solana']);
    const [selectedDexes, setSelectedDexes] = useState([]); // Empty = All
    const [showPreviewMenu, setShowPreviewMenu] = useState(false);
    const previewRef = useRef(null);

    // Close preview dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (previewRef.current && !previewRef.current.contains(event.target)) {
                setShowPreviewMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        // Rank by & Order
        rankBy: '',
        order: 'desc',

        // Toggles
        hasProfile: true,
        isBoosted: false,
        hasAds: false,

        // Numeric Filters
        minLiq: '', maxLiq: '',
        minMarketCap: '', maxMarketCap: '',
        minFdv: '', maxFdv: '',
        minAge: '', maxAge: '',

        // 24H
        min24HTxns: '', max24HTxns: '',
        min24HBuys: '', max24HBuys: '',
        min24HSells: '', max24HSells: '',
        min24HVol: '', max24HVol: '',
        min24HChg: '', max24HChg: '',

        // 6H
        min6HTxns: '', max6HTxns: '',
        min6HBuys: '', max6HBuys: '',
        min6HSells: '', max6HSells: '',
        min6HVol: '', max6HVol: '',
        min6HChg: '', max6HChg: '',

        // 1H
        min1HTxns: '', max1HTxns: '',
        min1HBuys: '', max1HBuys: '',
        min1HSells: '', max1HSells: '',
        min1HVol: '', max1HVol: '',
        min1HChg: '', max1HChg: '',

        // 5M
        min5MTxns: '', max5MTxns: '',
        min5MBuys: '', max5MBuys: '',
        min5MSells: '', max5MSells: '',
        min5MVol: '', max5MVol: '',
        min5MChg: '', max5MChg: '',

        // Labels
        labels: '',
    });

    // Load Initial Data for Edit Mode
    React.useEffect(() => {
        if (initialData) {
            const p = initialData.dexscreener_params || {};

            // Restore Platforms
            if (p.chainIds) setSelectedPlatforms(p.chainIds.split(','));
            else setSelectedPlatforms(['solana']); // default

            // Restore DEXes
            if (p.dexIds) setSelectedDexes(p.dexIds.split(','));
            else setSelectedDexes([]);

            // Restore Toggles
            // Note: DB stores them as params, we map back to boolean
            const newForm = { ...formData };
            newForm.name = initialData.name;
            newForm.hasProfile = p.profile === 1 || p.profile === '1';
            newForm.isBoosted = p.boosted === 1 || p.boosted === '1';
            newForm.rankBy = p.rankBy || '';
            newForm.order = p.order || 'desc';

            // Restore Numeric Fields
            const keys = Object.keys(formData);
            keys.forEach(k => {
                if (p[k] !== undefined) newForm[k] = p[k];
            });

            setFormData(newForm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleChange = (name) => {
        setFormData(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Selection Logic
    const togglePlatform = (id) => {
        if (selectedPlatforms.includes(id)) {
            if (selectedPlatforms.length > 1) setSelectedPlatforms(prev => prev.filter(p => p !== id));
        } else {
            setSelectedPlatforms(prev => [...prev, id]);
        }
    };

    const toggleDex = (id) => {
        if (selectedDexes.includes(id)) {
            setSelectedDexes(prev => prev.filter(d => d !== id));
        } else {
            setSelectedDexes(prev => [...prev, id]);
        }
    };

    const getParams = () => {
        const dsParams = {};
        const keys = [
            'minLiq', 'maxLiq', 'minMarketCap', 'maxMarketCap', 'minFdv', 'maxFdv', 'minAge', 'maxAge',
            'min24HVol', 'max24HVol', 'min6HVol', 'max6HVol', 'min1HVol', 'max1HVol', 'min5MVol', 'max5MVol',
            'min24HChg', 'max24HChg', 'min6HChg', 'max6HChg', 'min1HChg', 'max1HChg', 'min5MChg', 'max5MChg',
            'min24HTxns', 'max24HTxns', 'min6HTxns', 'max6HTxns', 'min1HTxns', 'max1HTxns', 'min5MTxns', 'max5MTxns',
            'min24HBuys', 'max24HBuys', 'min6HBuys', 'max6HBuys', 'min1HBuys', 'max1HBuys', 'min5MBuys', 'max5MBuys',
            'min24HSells', 'max24HSells', 'min6HSells', 'max6HSells', 'min1HSells', 'max1HSells', 'min5MSells', 'max5MSells'
        ];

        keys.forEach(k => { if (formData[k]) dsParams[k] = formData[k]; });

        if (formData.rankBy) dsParams.rankBy = formData.rankBy;
        if (formData.order) dsParams.order = formData.order;

        dsParams.chainIds = selectedPlatforms.join(',');
        if (selectedDexes.length > 0) dsParams.dexIds = selectedDexes.join(',');
        if (formData.hasProfile) dsParams.profile = 1;
        if (formData.isBoosted) dsParams.boosted = 1;

        return dsParams;
    };

    const handleDexPreview = (e) => {
        if (e) e.stopPropagation();
        const params = getParams();
        const url = generateDexScreenerUrl(params);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleGeckoPreview = (e) => {
        if (e) e.stopPropagation();
        const params = getParams();
        const url = generateGeckoTerminalUrl(params);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dsParams = getParams();

        try {
            if (initialData) {
                // UPDATE
                const { error } = await supabase
                    .from('filter_configs')
                    .update({
                        name: formData.name,
                        dexscreener_params: dsParams,
                        // processing_rules: {} // Keep existing rules? or overwrite? Let's overwrite as empty for now per prev logic
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                // INSERT
                const { error } = await supabase.from('filter_configs').insert([{
                    name: formData.name || 'Untitled Strategy',
                    dexscreener_params: dsParams,
                    processing_rules: {},
                    is_active: true
                }]);
                if (error) throw error;
            }

            onCreated();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '700px', height: '90vh', display: 'flex', flexDirection: 'column',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                position: 'relative', overflow: 'hidden'
            }}>

                {/* SUB MODALS */}
                {showPlatformModal && (
                    <SelectionModal
                        title="Select Platforms"
                        options={PLATFORMS}
                        selected={selectedPlatforms}
                        onToggle={togglePlatform}
                        onClose={() => setShowPlatformModal(false)}
                    />
                )}
                {showDexModal && (
                    <SelectionModal
                        title="Select DEXes"
                        options={DEXES}
                        selected={selectedDexes}
                        onToggle={toggleDex}
                        onClose={() => setShowDexModal(false)}
                    />
                )}

                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a2d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Customize Filters</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                    {/* PLATFORM & DEX SELECTORS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <button
                            onClick={() => setShowPlatformModal(true)}
                            style={{
                                padding: '12px', background: '#1e1e20', border: '1px solid #333', borderRadius: '8px',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white'
                            }}
                        >
                            {selectedPlatforms.length === 0 ? 'All Platforms' : selectedPlatforms.length === 1 ? PLATFORMS.find(p => p.id === selectedPlatforms[0])?.name : `${selectedPlatforms.length} Platforms`}
                        </button>
                        <button
                            onClick={() => setShowDexModal(true)}
                            style={{
                                padding: '12px', background: 'transparent', border: '1px solid #3b82f6', borderRadius: '8px',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white'
                            }}
                        >
                            {selectedDexes.length === 0 ? 'All DEXes' : `${selectedDexes.length} DEXes`}
                        </button>
                    </div>

                    <form id="stratForm" onSubmit={handleSubmit}>

                        {/* Strategy Name */}
                        <div style={{ marginBottom: '24px' }}>
                            <input
                                placeholder="Strategy Name (e.g. Moonshot)"
                                name="name" value={formData.name} onChange={handleChange} required
                                style={{ width: '100%', padding: '12px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white', fontSize: '1rem' }}
                            />
                        </div>

                        {/* Toggles Row */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                            {['hasProfile', 'isBoosted', 'hasAds'].map(key => (
                                <button
                                    type="button" key={key}
                                    onClick={() => toggleChange(key)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px',
                                        border: formData[key] ? '1px solid #00C6FF' : '1px solid #333',
                                        background: formData[key] ? 'rgba(0,198,255,0.1)' : 'transparent',
                                        color: formData[key] ? 'white' : '#666', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center'
                                    }}
                                >
                                    {key.replace('has', '').replace('is', '')} {formData[key] && <Check size={14} />}
                                </button>
                            ))}
                        </div>

                        {/* Rank by & Order */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '6px', fontWeight: 500 }}>
                                    Rank by
                                </label>
                                <select
                                    name="rankBy"
                                    value={formData.rankBy}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '10px 12px', background: '#1e1e20',
                                        border: '1px solid #333', borderRadius: '6px', color: 'white',
                                        fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Default (Trending 24H)</option>
                                    <optgroup label="Trending">
                                        <option value="trendingScoreM5">Trending 5M</option>
                                        <option value="trendingScoreH1">Trending 1H</option>
                                        <option value="trendingScoreH6">Trending 6H</option>
                                        <option value="trendingScoreH24">Trending 24H</option>
                                    </optgroup>
                                    <optgroup label="Activity">
                                        <option value="txns">Txns</option>
                                        <option value="buys">Buys</option>
                                        <option value="sells">Sells</option>
                                        <option value="volume">Volume</option>
                                    </optgroup>
                                    <optgroup label="Price Change">
                                        <option value="priceChangeM5">5M price change</option>
                                        <option value="priceChangeH1">1H price change</option>
                                        <option value="priceChangeH6">6H price change</option>
                                        <option value="priceChangeH24">24H price change</option>
                                    </optgroup>
                                    <optgroup label="Market Metrics">
                                        <option value="liquidity">Liquidity</option>
                                        <option value="marketCap">Market cap</option>
                                        <option value="fdv">FDV</option>
                                        <option value="pairAge">Pair age</option>
                                        <option value="activeBoosts">Boosts</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '6px', fontWeight: 500 }}>
                                    Order
                                </label>
                                <select
                                    name="order"
                                    value={formData.order}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '10px 12px', background: '#1e1e20',
                                        border: '1px solid #333', borderRadius: '6px', color: 'white',
                                        fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="desc">Descending</option>
                                    <option value="asc">Ascending</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: '#2a2a2d', margin: '20px 0' }}></div>

                        {/* General */}
                        <FilterRow label="Liquidity" minName="minLiq" maxName="maxLiq" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="Market Cap" minName="minMarketCap" maxName="maxMarketCap" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="FDV" minName="minFdv" maxName="maxFdv" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="Pair Age" minName="minAge" maxName="maxAge" suffix="h" formData={formData} onChange={handleChange} />

                        <div style={{ height: '1px', background: '#2a2a2d', margin: '20px 0' }}></div>

                        {/* 24H */}
                        <FilterRow label="24H txns" minName="min24HTxns" maxName="max24HTxns" formData={formData} onChange={handleChange} />
                        <FilterRow label="24H volume" minName="min24HVol" maxName="max24HVol" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="24H change" minName="min24HChg" maxName="max24HChg" suffix="%" formData={formData} onChange={handleChange} />

                        <div style={{ height: '1px', background: '#2a2a2d', margin: '20px 0' }}></div>

                        {/* 6H */}
                        <FilterRow label="6H txns" minName="min6HTxns" maxName="max6HTxns" formData={formData} onChange={handleChange} />
                        <FilterRow label="6H volume" minName="min6HVol" maxName="max6HVol" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="6H change" minName="min6HChg" maxName="max6HChg" suffix="%" formData={formData} onChange={handleChange} />

                        <div style={{ height: '1px', background: '#2a2a2d', margin: '20px 0' }}></div>

                        {/* 5M */}
                        <FilterRow label="5M txns" minName="min5MTxns" maxName="max5MTxns" formData={formData} onChange={handleChange} />
                        <FilterRow label="5M volume" minName="min5MVol" maxName="max5MVol" prefix="$" formData={formData} onChange={handleChange} />
                        <FilterRow label="5M change" minName="min5MChg" maxName="max5MChg" suffix="%" formData={formData} onChange={handleChange} />

                    </form>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a2d', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', background: '#18181b' }}>
                    {/* Preview Button Group with Dropdown */}
                    <div style={{ position: 'relative' }} ref={previewRef}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#1f1f23',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowPreviewMenu(!showPreviewMenu)}
                                style={{
                                    padding: '11px 14px',
                                    background: showPreviewMenu ? '#2a2a32' : 'transparent',
                                    border: 'none',
                                    color: '#ccc',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    borderRight: '1px solid #2e2e33',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Open preview destinations menu"
                            >
                                <ExternalLink size={16} />
                                <span>Preview</span>
                                <ChevronUp size={14} style={{ transform: showPreviewMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </button>

                            {/* GeckoTerminal Direct Icon Button */}
                            <button
                                type="button"
                                onClick={handleGeckoPreview}
                                title="Open preview on GeckoTerminal in new tab"
                                style={{
                                    padding: '10px 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRight: '1px solid #2e2e33',
                                    color: '#e4e4e7',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#27272a'; e.currentTarget.style.color = '#84cc16'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e4e4e7'; }}
                            >
                                <img src="https://assets.geckoterminal.com/vbj38y62bcljfdditis5y8t73b3d" alt="GeckoTerminal" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                                <span>Gecko</span>
                            </button>

                            {/* DexScreener Direct Icon Button */}
                            <button
                                type="button"
                                onClick={handleDexPreview}
                                title="Open preview on DexScreener in new tab"
                                style={{
                                    padding: '10px 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#e4e4e7',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#27272a'; e.currentTarget.style.color = '#22c55e'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e4e4e7'; }}
                            >
                                <img src="https://solscan.io/_next/static/media/dexscreener.e36090e0.png" alt="DexScreener" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
                                <span>Dex</span>
                            </button>
                        </div>

                        {/* Dropdown Menu directly under/above the Preview button */}
                        {showPreviewMenu && (
                            <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: 0,
                                minWidth: '260px',
                                background: '#18181b',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                                padding: '6px',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ padding: '6px 10px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', fontWeight: 600 }}>
                                    Preview Filter On
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { handleGeckoPreview(); setShowPreviewMenu(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#f4f4f5',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#27272a'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <img src="https://assets.geckoterminal.com/vbj38y62bcljfdditis5y8t73b3d" alt="GeckoTerminal" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#84cc16' }}>GeckoTerminal</span>
                                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Open filtered pools on GeckoTerminal</span>
                                    </div>
                                    <ExternalLink size={14} style={{ marginLeft: 'auto', color: '#71717a' }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { handleDexPreview(); setShowPreviewMenu(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#f4f4f5',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#27272a'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <img src="https://solscan.io/_next/static/media/dexscreener.e36090e0.png" alt="DexScreener" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22c55e' }}>DexScreener</span>
                                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Open filtered pairs on DexScreener</span>
                                    </div>
                                    <ExternalLink size={14} style={{ marginLeft: 'auto', color: '#71717a' }} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        form="stratForm" type="submit" className="btn-primary" disabled={loading}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 32px' }}
                    >
                        {loading ? 'Applying...' : <><Save size={18} /> Apply</>}
                    </button>
                </div>

            </div>
        </div>
    );
}
