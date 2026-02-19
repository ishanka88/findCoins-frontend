import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Activity, ShieldAlert, Coins, RefreshCw, ExternalLink, Layers, Plus, Filter, Zap, Pen, Edit, Settings, ChevronDown, ChevronUp, Twitter, Globe, Copy, MessageCircle, Send, LogOut, Trash2, ShieldCheck, Search, Check, X } from 'lucide-react';
import { CreateStrategyModal } from './CreateStrategyModal';
import { CustomFilterModal } from './CustomFilterModal';
import { BotSettingsModal } from './BotSettingsModal';
import { HolderRefreshRulesModal } from './HolderRefreshRulesModal';
import { BotActivityLog } from './BotActivityLog';
import { Login } from './Login';

// Helper for detailed time ago (e.g., "1 month and 4 days ago")
function formatDetailedTimeAgo(timestamp) {
  if (!timestamp) return 'N/A';
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'Just now';

  if (diff < hour) {
    const min = Math.floor(diff / minute);
    return `${min} min ago`;
  }

  if (diff < day) {
    const hrs = Math.floor(diff / hour);
    const mins = Math.floor((diff % hour) / minute);
    if (mins === 0) return `${hrs} hours ago`;
    return `${hrs} hours and ${mins} min ago`;
  }

  if (diff < month) {
    const days = Math.floor(diff / day);
    const hrs = Math.floor((diff % day) / hour);
    if (hrs === 0) return `${days} days ago`;
    return `${days} days and ${hrs} hours ago`;
  }

  if (diff < year) {
    const months = Math.floor(diff / month);
    const days = Math.floor((diff % month) / day);
    if (days === 0) return `${months} months ago`;
    return `${months} months and ${days} days ago`;
  }

  const years = Math.floor(diff / year);
  const months = Math.floor((diff % year) / month);
  if (months === 0) return `${years} years ago`;
  return `${years} years and ${months} months ago`;
}

// ...

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [tokens, setTokens] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [dexIcons, setDexIcons] = useState({}); // Mapping of id -> { url, name }
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHolderRulesModal, setShowHolderRulesModal] = useState(false);
  const [customFilters, setCustomFilters] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(() => localStorage.getItem('findcoins_active_view') || 'all');
  const [viewName, setViewName] = useState('');
  const [isSavingView, setIsSavingView] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const [stratToRun, setStratToRun] = useState(null);
  const [botSettings, setBotSettings] = useState(null);

  // State for Editing
  const [strategyToEdit, setStrategyToEdit] = useState(null);

  // Selection State
  const [selectedStratId, setSelectedStratId] = useState(null);
  const [activeCategory] = useState('all'); // 'all', 'safe', 'degen'
  const [expandedToken, setExpandedToken] = useState(null);
  const [tokenMetadata, setTokenMetadata] = useState({}); // Cache for metadata
  const [metaLoading, setMetaLoading] = useState({}); // Loading state per token
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Mobile tab state for Strategies/Bot Activity
  const [mobileTab, setMobileTab] = useState('strategies'); // 'strategies' or 'activity'

  const [copiedId, setCopiedId] = useState(null);
  const [moralisKeyInfo, setMoralisKeyInfo] = useState({ count: 0, keySnippet: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [dbResults, setDbResults] = useState([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [detailsToken, setDetailsToken] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const authToken = localStorage.getItem('findcoins_auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // Persist active view selection
  useEffect(() => {
    localStorage.setItem('findcoins_active_view', typeof activeViewId === 'string' ? activeViewId : activeViewId.id);
  }, [activeViewId]);

  // Handle Login
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('findcoins_auth');
    setIsAuthenticated(false);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStratId, activeCategory, customFilters]);

  // Handler for opening modal
  const handleOpenModal = (strat = null) => {
    setStrategyToEdit(strat);
    setShowModal(true);
  };

  // Fetch Initial Data
  useEffect(() => {
    fetchData();
    fetchActiveMoralisUsage();

    // Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
        fetchActiveMoralisUsage();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchData();
      fetchActiveMoralisUsage();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTokenDetails = async (address) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('contract_address', address)
        .single();

      if (data) setDetailsToken(data);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchActiveMoralisUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('moralis_keys')
        .select('key, usage_count, last_used_at')
        .eq('status', 'active')
        .eq('is_current', true)
        .limit(1);

      if (data && data.length > 0) {
        const keyData = data[0];
        setMoralisKeyInfo({
          count: keyData.usage_count || 0,
          keySnippet: keyData.key ? `${keyData.key.slice(0, 4)}...${keyData.key.slice(-4)}` : 'Unknown'
        });
      }
    } catch (err) {
      console.error("Error fetching moralis usage:", err);
    }
  };

  async function fetchData() {
    // 1. Fetch live metrics joined with static token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('active_tokens')
      .select(`
        *,
        dex_age,
        tokens (
          contract_address,
          symbol,
          token_name,
          logo_url,
          is_blacklisted,
          found_at,
          found_at_mcap,
          found_at_holders
        )
      `)
      .order('last_scraped_at', { ascending: false });

    if (tokenError) console.error("Token Fetch Error:", tokenError);
    if (tokenData) setTokens(tokenData.filter(t => !t.tokens?.is_blacklisted));

    const { data: stratData } = await supabase.from('filter_configs').select('*').order('created_at', { ascending: false });
    if (stratData) {
      setStrategies(stratData);
      if (!selectedStratId && stratData.length > 0) {
        setSelectedStratId(stratData[0].id);
      }
    }

    const { data: iconData } = await supabase.from('dex_icons').select('*');
    if (iconData) {
      const mapping = iconData.reduce((acc, icon) => {
        acc[icon.id] = icon;
        return acc;
      }, {});
      setDexIcons(mapping);
    }

    const { data: viewData } = await supabase.from('saved_views').select('*');
    if (viewData) setSavedViews(viewData);

    const { data: settingsData } = await supabase.from('bot_settings').select('*').single();
    if (settingsData) setBotSettings(settingsData);

    setLoading(false);
  }

  const handleDatabaseSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearchingDb(true);
    setSearchPerformed(false);
    setDbResults([]);

    try {
      const lowerSearch = searchTerm.toLowerCase();
      // Search the entire 'tokens' table
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .or(`symbol.ilike.%${lowerSearch}%,contract_address.ilike.%${lowerSearch}%`)
        .order('found_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSearchPerformed(true);
      if (data && data.length > 0) {
        setDbResults(data);
        // Open details modal directly
        setDetailsToken(data[0]);
      } else {
        setDbResults([]);
      }
    } catch (err) {
      console.error("Database search error:", err);
    } finally {
      setSearchingDb(false);
    }
  };


  // Metadata Fetching Logic
  const fetchTokenMetadata = async (token) => {
    const address = token.tokens.contract_address;
    if (!address) return;

    // Check Cache
    const CACHE_KEY = `meta_${address}`;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        // 1 hour cache
        if (now - parsed.timestamp < 3600 * 1000) {
          setTokenMetadata(prev => ({ ...prev, [address]: parsed.data }));
          return;
        }
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }

    // Fetch from API
    setMetaLoading(prev => ({ ...prev, [address]: true }));
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
      const data = await res.json();

      if (data.pairs && data.pairs.length > 0) {
        const pairInfo = data.pairs[0].info || {};
        const meta = {
          websites: pairInfo.websites || [],
          socials: pairInfo.socials || [],
          header: pairInfo.header,
          pairCreatedAt: data.pairs[0].pairCreatedAt
        };

        // Save to Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: meta
        }));

        setTokenMetadata(prev => ({ ...prev, [address]: meta }));
      }
    } catch (err) {
      console.error("Metadata fetch error:", err);
    } finally {
      setMetaLoading(prev => ({ ...prev, [address]: false }));
    }
  };

  const handleToggleExpand = (token) => {
    if (expandedToken === token.token_id) {
      setExpandedToken(null);
    } else {
      setExpandedToken(token.token_id);
      fetchTokenMetadata(token);
    }
  };

  const handleManualRefresh = async (e, tokenId) => {
    e.stopPropagation();
    try {
      await supabase
        .from('active_tokens')
        .update({ force_holder_refresh: true })
        .eq('token_id', tokenId);
    } catch (err) {
      console.error("Refresh Trigger Error:", err);
    }
  };

  const handleBlacklistToken = async (e, tokenId) => {
    e.stopPropagation();
    if (!window.confirm('Permanently remove this token from the list? It won\'t appear again.')) return;
    try {
      // Mark as blacklisted in the tokens table
      await supabase
        .from('tokens')
        .update({ is_blacklisted: true })
        .eq('id', tokenId);
      // Remove from active_tokens
      await supabase
        .from('active_tokens')
        .delete()
        .eq('token_id', tokenId);
      // Remove from local state immediately
      setTokens(prev => prev.filter(t => t.token_id !== tokenId));
    } catch (err) {
      console.error("Blacklist Error:", err);
    }
  };

  const handleCopy = (e, text, id) => {
    e.stopPropagation();
    if (!text) return;

    const copyFallback = (str) => {
      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
      }
      return success;
    };

    const performCopy = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        } else {
          return copyFallback(text);
        }
      } catch (err) {
        return copyFallback(text);
      }
    };

    performCopy().then(success => {
      if (success) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    });
  };

  const handleOpenAllLinks = (e, address) => {
    e.stopPropagation();
    if (!address) return;
    const links = [
      `https://dexscreener.com/solana/${address}`,
      `https://rugcheck.xyz/tokens/${address}`,
      `https://solscan.io/token/${address}#holders`,
      // Add more links here if needed
    ];

    // Try to open all links
    links.forEach(link => {
      const win = window.open(link, '_blank');
      // If window.open returns null, it was blocked
      if (!win) {
        alert("Pop-up blocked! Please click the icon in your address bar to 'Allow pop-ups' for this site.");
      }
    });
  };

  // Helper helper to check loose filters
  const doesTokenMatchCustomFilters = (t, filters) => {
    if (!filters || filters.length === 0) return true;
    for (const f of filters) {
      let val;
      if (f.field === 'mcap') val = t.mcap;
      else if (f.field === 'liquidity') val = t.liquidity;
      else if (f.field === 'volume') val = t.volume;
      else if (f.field === 'change_h24') val = t.change_h24;
      else if (f.field === 'holders') val = t.holders;
      // Add more fields if needed

      if (val === undefined || val === null) return false;
      const numVal = parseFloat(f.value);

      if (f.operator === '>') {
        if (val <= numVal) return false;
      } else if (f.operator === '<') {
        if (val >= numVal) return false;
      } else if (f.operator === '=') {
        // approximate equality for floats? or strict
        if (Math.abs(val - numVal) > 0.0001) return false;
      }
    }
    return true;
  };

  // Filter Logic
  const filteredTokens = tokens.filter(t => {
    // 1. Search Term (High Priority - Global Search)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const symbolMatch = t.tokens.symbol?.toLowerCase().includes(lowerSearch);
      const caMatch = t.tokens.contract_address?.toLowerCase().includes(lowerSearch);
      return symbolMatch || caMatch;
    }

    // 2. Must match selected strategy (only if no search)
    if (selectedStratId && t.strategy_id !== selectedStratId) return false;

    // 3. Custom Filters (only if no search)
    for (const f of customFilters) {
      let val;
      if (f.field === 'mcap') val = t.mcap;
      else if (f.field === 'liquidity') val = t.liquidity;
      else if (f.field === 'volume') val = t.volume;
      else if (f.field === 'change_h24') val = t.change_h24;
      else if (f.field === 'holders') val = t.holders;
      else if (f.field === 'price') val = t.price;

      if (val === undefined || val === null) return false;

      if (f.operator === '>' && !(val > f.value)) return false;
      if (f.operator === '<' && !(val < f.value)) return false;
      if (f.operator === '==' && !(val == f.value)) return false;
    }

    return true;
  }).sort((a, b) => {
    const rankA = a.dex_rank || 999;
    const rankB = b.dex_rank || 999;
    return rankA - rankB;
  });

  const handleSaveView = async () => {
    if (!viewName.trim() || customFilters.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          name: viewName,
          filters: customFilters,
          strategy_id: selectedStratId
        })
        .select()
        .single();

      if (error) throw error;
      setSavedViews(prev => [...prev, data]);
      setActiveViewId(data.id);
      setIsSavingView(false);
      setViewName('');
    } catch (err) {
      console.error("Save View Error:", err);
    }
  };

  const deleteView = async (e, id) => {
    e.stopPropagation();
    try {
      await supabase.from('saved_views').delete().eq('id', id);
      setSavedViews(prev => prev.filter(v => v.id !== id));
      if (activeViewId === id) {
        setActiveViewId('all');
        setCustomFilters([]);
      }
    } catch (err) {
      console.error("Delete View Error:", err);
    }
  };

  const selectView = (view) => {
    if (view === 'all') {
      setActiveViewId('all');
      setCustomFilters([]);
    } else {
      setActiveViewId(view.id);
      setCustomFilters(view.filters);
    }
  };

  const removeFilterCondition = (index) => {
    setCustomFilters(prev => prev.filter((_, i) => i !== index));
    // If we're on a saved view but modify it, we essentially "detach" from the view ID 
    // or we mark it as unsaved. For now, let's keep the ID but the Save button will appear later.
  };

  const isViewModified = () => {
    if (activeViewId === 'all') return customFilters.length > 0;
    const original = savedViews.find(v => v.id === activeViewId);
    if (!original) return false;
    return JSON.stringify(original.filters) !== JSON.stringify(customFilters);
  };

  const toggleStrategyActive = async (strat) => {
    setStratToRun(strat);
    setShowRunConfirm(true);
  };

  const performToggle = async (id, newState) => {
    try {
      const { error } = await supabase
        .from('filter_configs')
        .update({ is_active: newState })
        .eq('id', id);
      if (error) throw error;
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, is_active: newState } : s));
      setShowRunConfirm(false);
    } catch (err) {
      console.error("Toggle Strategy Error:", err);
    }
  };

  const formatCurrency = (num) => {
    if (!num) return '$0.00';
    if (num < 1) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 6 }).format(num);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
  };
  const isBotOnline = () => {
    if (!botSettings?.last_heartbeat) return false;
    const last = new Date(botSettings.last_heartbeat);
    const now = new Date();
    // If heartbeat was within last 90 seconds, consider online
    return (now - last) < 90000;
  };

  const formatMcap = (num) => {
    if (!num) return '$0';
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatNumber = (num) => {
    if (num === 0) return '0';
    if (!num) return '';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return num.toString();
  };

  const formatPct = (num) => {
    if (num === undefined || num === null) return '0%';
    const color = num >= 0 ? '#10b981' : '#ef4444';
    const sign = num >= 0 ? '+' : '';
    return <span style={{ color, fontWeight: 500 }}>{sign}{num.toFixed(2)}%</span>;
  };

  const formatAgeCol = (ageStr) => {
    if (!ageStr) return { text: 'N/A', color: '#888' };
    const age = ageStr.toLowerCase();
    let color = '#ccc';

    const isRecent = (age.endsWith('m') || age.endsWith('h') || age.endsWith('s')) && !age.includes('mo');

    if (isRecent) {
      color = '#10b981'; // Green for < 24h
    } else if (age.endsWith('d')) {
      const days = parseInt(age);
      if (days >= 7) color = '#ef4444'; // Red for > 7d
    } else if (age.includes('mo') || age.includes('y')) {
      color = '#ef4444'; // Month+ is also > 7d
    }

    return { text: ageStr, color };
  };

  const formatTimeAgo = (at) => {
    if (!at) return '';
    const date = new Date(at);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };


  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);
  const paginatedTokens = filteredTokens.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%)'
      }}>
        <div style={{ color: '#00C6FF', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

  // Show Login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Show Dashboard if authenticated
  return (
    <div className="app-container">
      {showModal && (
        <CreateStrategyModal
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
          initialData={strategyToEdit}
        />
      )}

      {showFilterModal && (
        <CustomFilterModal
          onClose={() => setShowFilterModal(false)}
          onAdd={(newFilter) => setCustomFilters(prev => [...prev, newFilter])}
        />
      )}

      {showSettingsModal && (
        <BotSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showHolderRulesModal && (
        <HolderRefreshRulesModal
          onClose={() => setShowHolderRulesModal(false)}
          strategies={strategies}
        />
      )}

      {/* Navbar */}
      <nav style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', background: '#0a0a0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary-gradient)', padding: '6px', borderRadius: '6px', display: 'flex' }}>
            <Zap color="white" size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.5px' }}>SOLANA SNIPER</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* BOT STATUS BADGE */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.03)',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isBotOnline() ? '#10b981' : '#ef4444',
              boxShadow: isBotOnline() ? '0 0 10px #10b981' : '0 0 10px #ef4444'
            }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isBotOnline() ? '#10b981' : '#ef4444' }}>
              BOT: {isBotOnline() ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div
            title={`Active Moralis Key: ${moralisKeyInfo.keySnippet}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(168, 85, 247, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              cursor: 'help'
            }}
          >
            <Zap size={12} color="#a855f7" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a855f7' }}>
              REQ: {moralisKeyInfo.count}
            </span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            style={{ padding: '8px 16px', background: '#1a1a1a', border: '1px solid #333', color: '#ccc', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
            title="Bot Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => setShowHolderRulesModal(true)}
            style={{ padding: '8px 16px', background: '#1a1a1a', border: '1px solid #333', color: '#ccc', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
            title="Holder Refresh Rules"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
            <Plus size={16} /> New Strategy
          </button>
        </div>
      </nav>

      <main style={{ padding: '32px' }}>
        <style>
          {`
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
              70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          `}
        </style>
        {botSettings?.moralis_api_status === 'error' && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{
              background: '#ef4444',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert color="white" size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#ff7676', fontSize: '1rem', fontWeight: 700 }}>Moralis API Limit Reached</h3>
              <p style={{ margin: '4px 0 0 0', color: '#ff9a9a', fontSize: '0.85rem', opacity: 0.9 }}>
                The bot has encountered a persistent 404/Plan Limit error from Moralis.
                Holder updates are currently paused.
                {botSettings?.moralis_error_at && (
                  <span style={{ marginLeft: '8px', fontWeight: 600 }}>
                    Error occurred at: {new Date(botSettings.moralis_error_at).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={fetchData}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* MOBILE TAB NAVIGATION - Only visible on mobile */}
        <div className="mobile-tabs" style={{
          display: 'none',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255,255,255,0.03)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <button
              onClick={() => setMobileTab('strategies')}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: mobileTab === 'strategies' ? 'var(--primary-gradient)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Activity size={16} />
              Strategies
            </button>
            <button
              onClick={() => setMobileTab('activity')}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: mobileTab === 'activity' ? 'var(--primary-gradient)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShieldAlert size={16} />
              Bot Activity
            </button>
          </div>
        </div>

        {/* ROW 1: STATS & LOGS */}
        <div className="strategies-activity-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '24px', marginBottom: '32px' }}>
          {/* ROW 1: STRATEGIES */}
          <div className={`glass-card strategies-section ${mobileTab === 'strategies' ? 'mobile-active' : 'mobile-hidden'}`} style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Activity size={20} style={{ color: '#00C6FF' }} />
              <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Active Strategies</h2>
              <span style={{ fontSize: '0.75rem', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                {strategies.length} Total
              </span>
              <button
                onClick={() => { setStrategyToEdit(null); setShowModal(true); }}
                className="btn-icon-small"
                style={{ marginLeft: 'auto', width: '28px', height: '28px' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {strategies.map(strat => (
                <div key={strat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                  <button
                    onClick={() => setSelectedStratId(selectedStratId === strat.id ? null : strat.id)}
                    className={`filter-btn ${selectedStratId === strat.id ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderColor: strat.is_active ? 'rgba(16, 185, 129, 0.3)' : '#333'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: strat.is_active ? '#10b981' : '#666',
                        boxShadow: strat.is_active ? '0 0 8px #10b981' : 'none'
                      }} />
                      <span>{strat.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Edit size={12} onClick={(e) => { e.stopPropagation(); setStrategyToEdit(strat); setShowModal(true); }} />
                    </div>
                  </button>

                  {selectedStratId === strat.id && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px', border: '1px solid #333' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', color: strat.is_active ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {strat.is_active ? 'RUNNING' : 'PAUSED'}
                        </span>
                        {!strat.is_active ? (
                          <button
                            onClick={() => toggleStrategyActive(strat)}
                            className="btn-primary"
                            style={{ padding: '2px 10px', fontSize: '0.7rem' }}
                          >
                            RUN
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStrategyActive(strat)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', padding: '2px 10px', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            STOP
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#666', borderBottom: '1px solid #222', paddingBottom: '2px' }}>DEXSCREENER PARAMS</span>
                        {Object.entries(strat.dexscreener_params).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: '#888' }}>{k}</span>
                            <span style={{ color: '#00C6FF' }}>{v.toString()}</span>
                          </div>
                        ))}

                        <span style={{ fontSize: '0.7rem', color: '#666', borderBottom: '1px solid #222', paddingBottom: '2px', marginTop: '8px' }}>PROCESSING RULES</span>
                        {Object.entries(strat.processing_rules).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: '#888' }}>{k}</span>
                            <span style={{ color: '#f59e0b' }}>{v.toString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`activity-section ${mobileTab === 'activity' ? 'mobile-active' : 'mobile-hidden'}`}>
            <BotActivityLog />
          </div>
        </div>

        {/* ROW 2: SAVED VIEWS & FILTERS */}
        <div style={{ marginBottom: '24px' }}>
          <div className="filter-controls-container">
            <div className="filter-views-group">
              <button
                onClick={() => selectView('all')}
                className={`filter-btn ${activeViewId === 'all' ? 'active' : ''}`}
              >
                All <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '4px' }}>({(tokens || []).length})</span>
              </button>
              {savedViews.filter(v => v.strategy_id === selectedStratId || !selectedStratId).map(view => (
                <div key={view.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => selectView(view)}
                    className={`filter-btn ${activeViewId === view.id ? 'active' : ''}`}
                    style={{ paddingRight: '30px' }}
                  >
                    <span>{view.name}</span>
                    {(() => {
                      const count = (tokens || []).filter(t => {
                        let matches = true;
                        // Always check Strategy ID if present in view
                        if (view.strategy_id) {
                          matches = matches && t.strategy_id === view.strategy_id;
                        }
                        // Then check custom filters saved in the view
                        if (view.filters && Array.isArray(view.filters)) {
                          matches = matches && doesTokenMatchCustomFilters(t, view.filters);
                        }
                        return matches;
                      }).length;

                      return count > 0 ? (
                        <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 'bold' }}>
                          ({count})
                        </span>
                      ) : null;
                    })()}
                  </button>
                  <ShieldAlert
                    size={12}
                    className="delete-view-icon"
                    onClick={(e) => deleteView(e, view.id)}
                    style={{ position: 'absolute', right: '10px', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>

            <div className="filter-actions-group">
              <div style={{ position: 'relative', width: '100%' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}
                />
                <input
                  type="text"
                  placeholder="Search all tokens..."
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    setDbResults([]);
                    setSearchPerformed(false);
                    if (val.trim()) {
                      setActiveViewId('all');
                      setCustomFilters([]);
                    }
                  }}
                  style={{
                    padding: '6px 12px 6px 30px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.8rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                {searchTerm && (
                  <X
                    size={12}
                    onClick={() => {
                      setSearchTerm('');
                      setDbResults([]);
                      setSearchPerformed(false);
                    }}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#666', cursor: 'pointer' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                {isViewModified() && !isSavingView && (
                  <button
                    onClick={() => setIsSavingView(true)}
                    className="btn-primary"
                    style={{ flex: 1, height: '30px', padding: '0 4px', fontSize: '0.8rem', fontWeight: '800', justifyContent: 'center', display: 'flex', alignItems: 'center', minWidth: 0, textTransform: 'uppercase' }}
                  >
                    Save View
                  </button>
                )}

                {isSavingView && (
                  <div style={{ flex: '1 1 0%', display: 'flex', gap: '4px', minWidth: 0, height: '30px' }}>
                    <input
                      type="text"
                      placeholder="Name..."
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      style={{ flex: 1, background: '#1a1a1b', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', minWidth: 0 }}
                    />
                    <button onClick={handleSaveView} className="btn-primary" style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>✓</button>
                  </div>
                )}

                <button
                  onClick={() => setShowFilterModal(true)}
                  className="btn-secondary"
                  style={{ flex: 1, height: '30px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '800', justifyContent: 'center', minWidth: 0, padding: '0 4px', textTransform: 'uppercase' }}
                >
                  <Plus size={14} /> Add Filter
                </button>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ width: '30px', height: '30px', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid #333' }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE CONDITION CHIPS */}
          {customFilters.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #333' }}>
              <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '4px', alignSelf: 'center' }}>Active Filters:</span>
              {customFilters.map((f, i) => (
                <div key={i} className="filter-chip">
                  <span>{f.field} {f.operator} {formatNumber(f.value)}</span>
                  <button onClick={() => removeFilterCondition(i)}>✕</button>
                </div>
              ))}
              <button
                onClick={() => { setCustomFilters([]); setActiveViewId('all'); }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', marginLeft: 'auto' }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* ROW 3: DATA TABLE */}
        <section>
          <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid #222' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', background: '#121212' }}>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Token</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>5M / 1H / 24H</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>MC / Price</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Holders</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Makers</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Volume / Txns</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Liquidity</th>
                  <th style={{ padding: '16px', fontWeight: '600', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading Feed...</td></tr>
                ) : paginatedTokens.length > 0 ? (
                  paginatedTokens.map((token) => (
                    <React.Fragment key={token.token_id}>
                      <tr
                        onClick={() => handleToggleExpand(token)}
                        className="animate-enter"
                        style={{
                          borderBottom: expandedToken === token.token_id ? 'none' : '1px solid #222',
                          transition: 'background 0.2s',
                          cursor: 'pointer',
                          background: expandedToken === token.token_id ? 'rgba(0,198,255,0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {token.dex_rank && (
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: '#555',
                                minWidth: '24px'
                              }}>
                                #{token.dex_rank}
                              </div>
                            )}
                            {token.tokens.logo_url && token.tokens.logo_url !== 'N/A' ? (
                              <img src={token.tokens.logo_url} alt={token.tokens.symbol} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#666' }}>
                                {token.tokens.symbol?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {token.dex_icon_id && dexIcons[token.dex_icon_id] && (
                                    <img
                                      src={dexIcons[token.dex_icon_id].url}
                                      alt={dexIcons[token.dex_icon_id].name}
                                      style={{ width: '12px', height: '12px', borderRadius: '2px', flexShrink: 0 }}
                                      title={dexIcons[token.dex_icon_id].name}
                                    />
                                  )}
                                  <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{token.tokens.symbol}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                  Scraped {formatTimeAgo(token.last_scraped_at)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
                                  {token.tokens.contract_address.slice(0, 4)}...{token.tokens.contract_address.slice(-4)}
                                </span>
                                <div onClick={(e) => handleCopy(e, `https://dexscreener.com/solana/${token.tokens.contract_address}`, token.token_id)} style={{ color: copiedId === token.token_id ? '#22c55e' : '#00C6FF', cursor: 'pointer', display: 'flex', position: 'relative' }}>
                                  {copiedId === token.token_id && (
                                    <span style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      backgroundColor: '#22c55e',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      whiteSpace: 'nowrap',
                                      marginBottom: '4px',
                                      zIndex: 10,
                                      pointerEvents: 'none',
                                      fontWeight: 'bold'
                                    }}>
                                      Copied!
                                    </span>
                                  )}
                                  {copiedId === token.token_id ? (
                                    <Check size={12} title="Copied!" />
                                  ) : (
                                    <Copy size={12} title="Copy DexScreener Link" />
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
                                  <a href={`https://dexscreener.com/solana/${token.tokens.contract_address}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                                    <img src="https://solscan.io/_next/static/media/dexscreener.e36090e0.png" alt="DexScreener" style={{ width: '12px', height: '12px', borderRadius: '2px' }} />
                                  </a>
                                  <a href={`https://solscan.io/token/${token.tokens.contract_address}#holders`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#a855f7' }}><ExternalLink size={12} /></a>


                                  <a href={`https://rugcheck.xyz/tokens/${token.tokens.contract_address}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                                    <ShieldCheck size={12} color="#ef4444" />
                                  </a>
                                  {token.dex_age && (
                                    <span style={{
                                      fontSize: '0.9rem',
                                      fontWeight: 'bold',
                                      marginLeft: '8px',
                                      color: (() => {
                                        const ageStr = token.dex_age.toLowerCase();
                                        if (ageStr.includes('y') || ageStr.includes('mo')) return '#ef4444'; // Red for Years/Months
                                        if (ageStr.includes('d')) {
                                          const days = parseInt(ageStr);
                                          return days >= 7 ? '#ef4444' : '#3b82f6'; // Red >= 7d, Blue < 7d
                                        }
                                        return '#22c55e'; // Green < 24h
                                      })()
                                    }}>
                                      {token.dex_age}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}><span>5m</span>{formatPct(token.change_m5)}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}><span>1h</span>{formatPct(token.change_h1)}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}><span>24h</span>{formatPct(token.change_h24)}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>{formatMcap(token.mcap)}</div>
                          <div style={{ color: '#00C6FF', fontSize: '0.75rem', fontFamily: 'monospace' }}>{formatCurrency(token.price)}</div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: '80px' }}>
                            <span style={{ color: '#fff', fontSize: '0.9rem', lineHeight: 1 }}>{token.holders}</span>
                            <button
                              className={`btn-icon-small ${token.force_holder_refresh ? 'loading' : ''}`}
                              onClick={(e) => handleManualRefresh(e, token.token_id)}
                              disabled={token.force_holder_refresh}
                              title="Refresh Holders"
                              style={{ width: '18px', height: '18px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
                            >
                              <RefreshCw size={10} className={token.force_holder_refresh ? 'animate-spin' : ''} />
                            </button>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                            Updated {formatTimeAgo(token.holders_updated_at)}
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#fff', fontSize: '0.9rem' }}>{formatNumber(token.makers)}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: '#fff', fontSize: '0.9rem' }}>{formatNumber(token.volume)}</div>
                          <div style={{ color: '#00C6FF', fontSize: '0.75rem', fontWeight: '500' }}>{formatNumber(token.txns)} txns</div>
                        </td>
                        <td style={{ padding: '16px', color: '#fff', fontSize: '0.9rem' }}>{formatMcap(token.liquidity)}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn-icon-small"
                              onClick={(e) => handleBlacklistToken(e, token.token_id)}
                              title="Remove permanently"
                              style={{ width: '18px', height: '18px', border: '1px solid rgba(255,80,80,0.2)', background: 'transparent', cursor: 'pointer' }}
                            >
                              <Trash2 size={10} color="#ff5050" />
                            </button>
                            {expandedToken === token.token_id ? <ChevronUp size={16} color="#00C6FF" /> : <ChevronDown size={16} color="#666" />}
                            <button
                              className="btn-icon-small"
                              onClick={(e) => handleOpenAllLinks(e, token.tokens.contract_address)}
                              title="Open All Links"
                              style={{ width: '18px', height: '18px', padding: 0, background: 'transparent', cursor: 'pointer', marginLeft: '6px' }}
                            >
                              <Layers size={14} color="#00C6FF" />
                            </button>
                            <a
                              href={`https://solscan.io/token/${token.tokens.contract_address}#holders`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Solscan Holders"
                              style={{ marginLeft: '6px', display: 'flex', alignItems: 'center' }}
                            >
                              <Search size={14} color="#00C6FF" />
                            </a>
                          </div>
                        </td>
                      </tr>
                      {expandedToken === token.token_id && (
                        <tr style={{ borderBottom: '1px solid #222', background: 'rgba(0,198,255,0.02)' }}>
                          <td colSpan="7" style={{ padding: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                              {/* Left Column - Description & Socials */}
                              <div>
                                <h4 style={{ margin: '0 0 10px 0', color: '#00C6FF', fontSize: '0.9rem' }}>
                                  About {token.tokens.symbol}
                                </h4>
                                {metaLoading[token.tokens.contract_address] ? (
                                  <div style={{ color: '#666', fontSize: '0.8rem' }}>Loading metadata...</div>
                                ) : tokenMetadata[token.tokens.contract_address] ? (
                                  <div>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                      {tokenMetadata[token.tokens.contract_address].websites?.map((site, i) => (
                                        <a key={i} href={site.url} target="_blank" rel="noreferrer" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                          <Globe size={14} /> Website
                                        </a>
                                      ))}
                                      {tokenMetadata[token.tokens.contract_address].socials?.map((social, i) => {
                                        let Icon = ExternalLink;
                                        if (social.type === 'twitter') Icon = Twitter;
                                        if (social.type === 'telegram') Icon = Send; // Lucide doesn't have Telegram, Send is close
                                        if (social.type === 'discord') Icon = MessageCircle;

                                        return (
                                          <a key={i} href={social.url} target="_blank" rel="noreferrer" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                            <Icon size={14} /> {social.type.charAt(0).toUpperCase() + social.type.slice(1)}
                                          </a>
                                        );
                                      })}
                                      {(!tokenMetadata[token.tokens.contract_address].websites?.length && !tokenMetadata[token.tokens.contract_address].socials?.length) && (
                                        <div style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>No additional links found.</div>
                                      )}
                                    </div>
                                    {tokenMetadata[token.tokens.contract_address].header && (
                                      <img src={tokenMetadata[token.tokens.contract_address].header} alt="Header" style={{ width: '100%', borderRadius: '8px', opacity: 0.8, maxHeight: '120px', objectFit: 'cover' }} />
                                    )}
                                  </div>
                                ) : (
                                  <p style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    No description available.
                                  </p>
                                )}
                                {tokenMetadata[token.token_id]?.website && (
                                  <a href={tokenMetadata[token.token_id].website} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Globe size={12} /> Website
                                  </a>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                  <ShieldAlert size={14} color={token.holders > 300 ? '#ef4444' : '#10b981'} />
                                  <span style={{ fontSize: '0.8rem', color: '#888' }}>Holders: {token.holders > 300 ? 'Safe' : 'Risky'}</span>
                                </div>
                              </div>
                              {/* Right Column - Additional Stats */}
                              <div>
                                <h4 style={{ margin: '0 0 10px 0', color: '#00C6FF', fontSize: '0.9rem' }}>Token Details</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Created At:</span>
                                    <span style={{ color: '#fff', fontSize: '0.8rem' }}>
                                      {tokenMetadata[token.tokens.contract_address]?.pairCreatedAt
                                        ? formatDetailedTimeAgo(tokenMetadata[token.tokens.contract_address].pairCreatedAt)
                                        : new Date(token.tokens.found_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Found At:</span>
                                    <span style={{ color: '#00C6FF', fontSize: '0.8rem', fontWeight: 600 }}>
                                      {token.tokens.found_at ? formatDetailedTimeAgo(new Date(token.tokens.found_at).getTime()) : 'N/A'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Found At Mc:</span>
                                    <span style={{ color: '#00C6FF', fontSize: '0.8rem', fontWeight: 600 }}>
                                      {token.tokens.found_at_mcap != null ? formatMcap(token.tokens.found_at_mcap) : 'N/A'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Found At Holders:</span>
                                    <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                                      {token.tokens.found_at_holders != null ? token.tokens.found_at_holders : 'N/A'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Strategy:</span>
                                    <span style={{ color: '#fff', fontSize: '0.8rem' }}>{strategies.find(s => s.id === token.strategy_id)?.name || 'Unknown'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : searchTerm ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ color: '#888', marginBottom: '16px', fontSize: '1rem' }}>
                        {searchPerformed && dbResults.length === 0
                          ? "There is no coin in the database."
                          : "Coin is not in the list. Do you want to find in the token database?"}
                      </div>

                      {(!searchPerformed || dbResults.length > 0) && (
                        <button
                          onClick={handleDatabaseSearch}
                          disabled={searchingDb}
                          className="btn-primary"
                          style={{ padding: '8px 24px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                          {searchingDb ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                          Find in Database
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No tokens found.</td></tr>
                )}
              </tbody>
            </table>

            {/* MOBILE CARD VIEW - Only visible on mobile */}
            <div className="mobile-token-cards">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading Feed...</div>
              ) : paginatedTokens.length > 0 ? (
                paginatedTokens.map((token) => (
                  <div
                    key={token.token_id}
                    className="glass-card mobile-token-card"
                    onClick={() => handleToggleExpand(token)}
                    style={{
                      padding: '14px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      border: expandedToken === token.token_id ? '1px solid rgba(0,198,255,0.3)' : '1px solid var(--glass-border)',
                      background: expandedToken === token.token_id ? 'rgba(0,198,255,0.05)' : 'var(--glass-bg)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Token Header - Compact & Packed with Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {/* Rank */}
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#555', minWidth: '18px' }}>
                        #{token.dex_rank || '-'}
                      </div>

                      {/* Logo */}
                      {token.tokens.logo_url && token.tokens.logo_url !== 'N/A' ? (
                        <img src={token.tokens.logo_url} alt={token.tokens.symbol} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#666' }}>
                          {token.tokens.symbol?.charAt(0)}
                        </div>
                      )}

                      {/* Symbol & Age */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.85rem' }}>{token.tokens.symbol}</span>
                          <span className={`badge ${token.is_gained ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.55rem', padding: '1px 3px' }}>
                            {token.is_gained ? 'W' : 'L'}
                          </span>
                          {token.dex_age && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: formatAgeCol(token.dex_age).color }}>
                              {token.dex_age}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-icon-small"
                          onClick={(e) => handleCopy(e, `https://dexscreener.com/solana/${token.tokens.contract_address}`, token.token_id)}
                          title="Copy DexScreener Link"
                          style={{ width: '24px', height: '24px', padding: 0, position: 'relative' }}
                        >
                          {copiedId === token.token_id && (
                            <span style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#22c55e',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px',
                              zIndex: 10,
                              pointerEvents: 'none',
                              fontWeight: 'bold'
                            }}>
                              Copied!
                            </span>
                          )}
                          {copiedId === token.token_id ? (
                            <Check size={12} color="#22c55e" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <a href={`https://dexscreener.com/solana/${token.tokens.contract_address}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                          <img src="https://solscan.io/_next/static/media/dexscreener.e36090e0.png" alt="Dex" style={{ width: '16px', height: '16px', borderRadius: '2px' }} />
                        </a>
                        <a href={`https://rugcheck.xyz/tokens/${token.tokens.contract_address}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                          <ShieldAlert size={16} color="#ef4444" />
                        </a>
                        <button
                          className="btn-icon-small"
                          onClick={(e) => handleOpenAllLinks(e, token.tokens.contract_address)}
                          title="Open All Links"
                          style={{ width: '24px', height: '24px', padding: 0, background: 'transparent', cursor: 'pointer' }}
                        >
                          <Layers size={14} color="#00C6FF" />
                        </button>
                        <a
                          href={`https://solscan.io/token/${token.tokens.contract_address}#holders`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Solscan Holders"
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <Search size={14} color="#00C6FF" />
                        </a>
                        <button
                          className="btn-icon-small"
                          onClick={(e) => handleBlacklistToken(e, token.token_id)}
                          title="Remove permanently"
                          style={{ width: '24px', height: '24px', padding: 0, border: '1px solid rgba(255,80,80,0.2)', background: 'transparent', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} color="#ff5050" />
                        </button>
                        <ChevronDown
                          size={16}
                          style={{
                            color: '#666',
                            transform: expandedToken === token.token_id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            marginLeft: '4px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Key Metrics Grid - Compact */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: '6px', marginBottom: '0' }}>
                      {/* Market Cap */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '2px' }}>MCAP</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#00C6FF' }}>
                          {formatMcap(token.mcap)}
                        </div>
                      </div>

                      {/* Holders with Refresh */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', position: 'relative' }}>
                        <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '2px' }}>HOLDERS</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                            {token.holders ? token.holders : '-'}
                          </div>
                          <button
                            className={`btn-icon-small ${token.force_holder_refresh ? 'loading' : ''}`}
                            onClick={(e) => handleManualRefresh(e, token.token_id)}
                            disabled={token.force_holder_refresh}
                            style={{ width: '16px', height: '16px', padding: 0, border: 'none', background: 'transparent' }}
                          >
                            <RefreshCw size={10} className={token.force_holder_refresh ? 'animate-spin' : ''} style={{ opacity: 0.7 }} />
                          </button>
                        </div>
                      </div>

                      {/* Volume */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '2px' }}>VOL</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>
                          {formatMcap(token.volume)}
                        </div>
                      </div>

                      {/* Price Change */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '2px' }}>24H</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: token.change_h24 >= 0 ? '#10b981' : '#ef4444' }}>
                          {token.change_h24?.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedToken === token.token_id && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #222' }}>
                        {metaLoading[token.tokens.contract_address] ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            <div className="animate-spin" style={{ display: 'inline-block' }}>⟳</div>
                            <div style={{ marginTop: '8px', fontSize: '0.75rem' }}>Loading metadata...</div>
                          </div>
                        ) : tokenMetadata[token.tokens.contract_address] ? (
                          <div style={{ fontSize: '0.75rem' }}>
                            {/* Links */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {tokenMetadata[token.tokens.contract_address].websites?.map((site, i) => (
                                <a
                                  key={i}
                                  href={site.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '6px 10px',
                                    background: 'rgba(0,198,255,0.1)',
                                    border: '1px solid rgba(0,198,255,0.3)',
                                    borderRadius: '6px',
                                    color: '#00C6FF',
                                    fontSize: '0.7rem',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Globe size={12} /> Website
                                </a>
                              ))}
                              {tokenMetadata[token.tokens.contract_address].socials?.map((social, i) => {
                                let Icon = ExternalLink;
                                let label = social.type;
                                let color = '#fff';
                                let bg = 'rgba(255,255,255,0.05)';
                                let border = 'rgba(255,255,255,0.1)';

                                if (social.type === 'twitter') {
                                  Icon = Twitter;
                                  label = 'Twitter';
                                  color = '#1DA1F2';
                                  bg = 'rgba(29,161,242,0.1)';
                                  border = 'rgba(29,161,242,0.3)';
                                } else if (social.type === 'telegram') {
                                  Icon = Send;
                                  label = 'Telegram';
                                  color = '#229ED9';
                                  bg = 'rgba(34,158,217,0.1)';
                                  border = 'rgba(34,158,217,0.3)';
                                }

                                return (
                                  <a
                                    key={i}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      padding: '6px 10px',
                                      background: bg,
                                      border: `1px solid ${border}`,
                                      borderRadius: '6px',
                                      color: color,
                                      fontSize: '0.7rem',
                                      textDecoration: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      textTransform: 'capitalize'
                                    }}
                                  >
                                    <Icon size={12} /> {label}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))
              ) : searchTerm ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
                    {searchPerformed && dbResults.length === 0
                      ? "There is no coin in the database."
                      : "Coin is not in the list. Do you want to find in the token database?"}
                  </div>

                  {(!searchPerformed || dbResults.length > 0) && (
                    <button
                      onClick={handleDatabaseSearch}
                      disabled={searchingDb}
                      className="btn-primary"
                      style={{ padding: '8px 24px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                    >
                      {searchingDb ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                      Find in Database
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No tokens found.</div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <div style={{ color: '#666', fontSize: '0.85rem' }}>
                Showing <span style={{ color: '#fff' }}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span style={{ color: '#fff' }}>{Math.min(currentPage * itemsPerPage, filteredTokens.length)}</span> of <span style={{ color: '#fff' }}>{filteredTokens.length}</span> tokens
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(() => {
                    const getPageNumbers = () => {
                      if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
                      if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
                      if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                      return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                    };

                    return getPageNumbers().map((page, i) => (
                      <button
                        key={i}
                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                        className={typeof page === 'number' ? '' : 'no-hover'}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: currentPage === page ? 'var(--primary-gradient)' : '#1a1a1a',
                          border: '1px solid #333',
                          color: '#fff',
                          cursor: typeof page === 'number' ? 'pointer' : 'default',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* DETAILS MODAL */}
      {
        detailsToken && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#00C6FF' }}>Token Database Details</h2>
                <button
                  onClick={() => {
                    setDetailsToken(null);
                    // Clear URL param without reloading
                    const newUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid #333' }}>
                {detailsToken.logo_url && detailsToken.logo_url !== 'N/A' ? (
                  <img src={detailsToken.logo_url} alt={detailsToken.symbol} style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#666' }}>
                    {detailsToken.symbol?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>{detailsToken.symbol}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>{detailsToken.contract_address}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Found At</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{new Date(detailsToken.found_at).toLocaleString()}</div>
                </div>
                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Found At Mcap</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#00C6FF' }}>{formatMcap(detailsToken.found_at_mcap)}</div>
                </div>
                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Found At Holders</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>{detailsToken.found_at_holders}</div>
                </div>
                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Token Name</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{detailsToken.token_name || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <a
                  href={`https://dexscreener.com/solana/${detailsToken.contract_address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '12px', borderRadius: '8px' }}
                >
                  View on DexScreener
                </a>
                <button
                  onClick={() => setDetailsToken(null)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* TOGGLE CONFIRMATION MODAL */}
      {
        showRunConfirm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>
                {stratToRun?.is_active ? 'Confirm Stop' : 'Confirm Start'}
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '24px' }}>
                Are you sure you want to {stratToRun?.is_active ? 'stop' : 'start'} the <strong>{stratToRun?.name}</strong> strategy?
                {stratToRun?.is_active
                  ? ' The bot will stop scraping new tokens for this strategy.'
                  : ' The bot will begin scraping tokens immediately.'}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => performToggle(stratToRun.id, !stratToRun.is_active)}
                  className={stratToRun?.is_active ? 'btn-red' : 'btn-primary'}
                  style={{
                    flex: 1,
                    background: stratToRun?.is_active ? 'var(--accent-red)' : 'var(--primary-gradient)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Yes, {stratToRun?.is_active ? 'Stop' : 'Start'} Strategy
                </button>
                <button
                  onClick={() => setShowRunConfirm(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;
