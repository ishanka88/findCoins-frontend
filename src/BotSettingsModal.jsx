import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2, Plus, Zap } from 'lucide-react';
import { supabase } from './supabaseClient';

// Helper for relative time (e.g., "1m ago", "3h ago")
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSecs < 60) return 'just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
}

export function BotSettingsModal({ onClose }) {
    const [settings, setSettings] = useState({
        scraping_interval_seconds: 60,
        max_tokens_per_strategy: 100,
        enable_holder_check: true
    });
    const [keys, setKeys] = useState([]);
    const [newKey, setNewKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingKey, setAddingKey] = useState(false);
    const [checkingKeys, setCheckingKeys] = useState({}); // { id: boolean }
    const [timeLeftToReset, setTimeLeftToReset] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
            const diffInMs = tomorrow - now;

            const hours = Math.floor(diffInMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);

            return `${String(hours).padStart(2, '0')}H :${String(minutes).padStart(2, '0')}M:${String(seconds).padStart(2, '0')}S`;
        };

        setTimeLeftToReset(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeftToReset(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        loadData();

        const channel = supabase
            .channel('moralis-keys-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'moralis_keys' }, () => {
                fetchKeys();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            await Promise.all([loadSettings(), fetchKeys()]);
        } catch (e) {
            console.error("Critical error loading data", e);
        } finally {
            setLoading(false);
        }
    }

    async function loadSettings() {
        try {
            const { data, error } = await supabase
                .from('bot_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (data) setSettings(data);
            if (error) console.error("Error fetching settings", error);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function fetchKeys() {
        try {
            const { data, error } = await supabase
                .from('moralis_keys')
                .select('*')
                .order('created_at', { ascending: true });

            // Ensure data is an array
            if (data && Array.isArray(data)) {
                setKeys(data);
            } else {
                setKeys([]);
            }
        } catch (error) {
            console.error('Error loading keys:', error);
            setKeys([]);
        }
    }

    async function handleAddKey() {
        if (!newKey.trim()) return;
        if (!window.confirm("Are you sure you want to add this API key?")) return;

        // Clean the key (remove "MORALIS_API_KEY=" prefix if pasted by accident)
        const cleanedKey = newKey.trim().replace(/^(MORALIS_API_KEY=|KEY=)/i, '').trim();

        setAddingKey(true);
        try {
            const { error } = await supabase
                .from('moralis_keys')
                .insert([{ key: cleanedKey }]);

            if (error) throw error;
            setNewKey('');
            fetchKeys();
        } catch (error) {
            console.error('Error adding key:', error);
            alert('Failed to add key: ' + error.message);
        } finally {
            setAddingKey(false);
        }
    }

    async function handleDeleteKey(id) {
        if (!window.confirm("Are you sure you want to delete this API key?")) return;

        try {
            const { error } = await supabase
                .from('moralis_keys')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // Realtime will update, but we can also fetch
            fetchKeys();
        } catch (error) {
            console.error('Error deleting key:', error);
            alert('Failed to delete key: ' + error.message);
        }
    }

    async function checkKeyStatus(keyRecord) {
        if (!keyRecord?.key) return;

        setCheckingKeys(prev => ({ ...prev, [keyRecord.id]: true }));
        try {
            const url = `https://solana-gateway.moralis.io/token/mainnet/holders/So11111111111111111111111111111111111111112`;
            const resp = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': keyRecord.key
                }
            });

            const statusMessages = {
                200: "ok",
                400: "Bad Request",
                404: "Not Found",
                429: "Too Many Requests",
                500: "Internal Server Error",
                401: "Validation service blocked: Your plan: free-plan-daily total included usage has been consumed, please upgrade your plan here,"
            };

            const msg = statusMessages[resp.status] || `Unexpected Status: ${resp.status}`;

            if (resp.status === 200) {
                alert(`Status 200: ${msg}`);
            } else {
                alert(`Status ${resp.status}: ${msg}\n\nDetailed log opened in a new tab.`);
                try {
                    const errorData = await resp.json();
                    const blob = new Blob([JSON.stringify(errorData, null, 2)], { type: 'application/json' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                } catch (e) {
                    // If no JSON, just open the raw text if possible 
                }
            }
        } catch (error) {
            console.error('Error checking key status:', error);
            alert('Failed to check key status: ' + error.message);
        } finally {
            setCheckingKeys(prev => ({ ...prev, [keyRecord.id]: false }));
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('bot_settings')
                .update({
                    scraping_interval_seconds: Number(settings?.scraping_interval_seconds || 60),
                    max_tokens_per_strategy: Number(settings?.max_tokens_per_strategy || 100),
                    enable_holder_check: settings?.enable_holder_check ?? true
                })
                .eq('id', 1);

            if (error) throw error;
            onClose();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    const totalUsage = Array.isArray(keys) ? keys.reduce((acc, k) => acc + (k.usage_count || 0), 0) : 0;
    const activeKeysCount = Array.isArray(keys) ? keys.filter(k => k.status === 'active').length : 0;
    const totalKeysCount = Array.isArray(keys) ? keys.length : 0;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '600px',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Settings size={20} color="#00C6FF" />
                        <h3 style={{ margin: 0, color: 'white' }}>Bot Settings</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
                ) : (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Scraping Interval (seconds)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="600"
                                value={settings?.scraping_interval_seconds || 60}
                                onChange={(e) => setSettings({ ...settings, scraping_interval_seconds: e.target.value })}
                                style={{ width: '100%', padding: '10px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.8rem' }}>How often the bot checks for new tokens (10-600 seconds)</small>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Max Tokens Per Strategy
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="500"
                                value={settings?.max_tokens_per_strategy || 100}
                                onChange={(e) => setSettings({ ...settings, max_tokens_per_strategy: e.target.value })}
                                style={{ width: '100%', padding: '10px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.8rem' }}>Maximum tokens to process per strategy per interval</small>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings?.enable_holder_check ?? true}
                                    onChange={(e) => setSettings({ ...settings, enable_holder_check: e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Enable Holder Count Check</span>
                            </label>
                            <small style={{ color: '#666', fontSize: '0.8rem', marginLeft: '28px' }}>Fetch holder counts via Moralis API</small>
                        </div>

                        {/* MORALIS KEYS SECTION */}
                        <div style={{ borderTop: '1px solid #333', paddingTop: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, color: '#00C6FF', fontSize: '0.95rem' }}>Moralis API Keys ({activeKeysCount}/{totalKeysCount})</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Total Requests: {totalUsage}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>Daily Reset in: {timeLeftToReset}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="text"
                                    placeholder="Paste new API Key..."
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    style={{ flex: 1, padding: '8px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                                />
                                <button
                                    onClick={handleAddKey}
                                    disabled={addingKey || !newKey.trim()}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                {(!keys || keys.length === 0) ? (
                                    <div style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                        No keys added. Bot will fail to fetch holders.
                                    </div>
                                ) : (
                                    keys.map(k => (
                                        <div key={k?.id || Math.random()} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px',
                                            border: k?.is_current ? '1px solid #00C6FF' : (k?.status === 'active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)')
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* Replaced Key icon with simple text/dot to avoid import issues */}
                                                <div style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    background: k?.status === 'active' ? '#10b981' : '#ef4444',
                                                    boxShadow: k?.status === 'active' ? '0 0 5px #10b981' : '0 0 5px #ef4444'
                                                }} />
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                        {k?.key ? `${k.key.slice(0, 8)}...${k.key.slice(-4)}` : 'Unknown Key'}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            color: k?.status === 'active' ? '#10b981' : (k?.status === 'rate_limited' ? '#f59e0b' : '#ef4444'),
                                                            textTransform: 'uppercase', fontWeight: '700'
                                                        }}>
                                                            {k?.status === 'quota_exceeded' ? 'QUOTA EXCEEDED' : (k?.status === 'rate_limited' ? 'RATE LIMITED' : (k?.status || 'UNKNOWN'))}
                                                        </span>
                                                        <span style={{ color: '#666' }}>•</span>
                                                        <span style={{ color: '#ccc' }}>{k?.usage_count || 0} reqs</span>
                                                        <span style={{ color: '#666' }}>•</span>
                                                        <span style={{ color: '#888', fontStyle: 'italic' }}>{formatTimeAgo(k?.last_used_at)}</span>
                                                        {k?.is_current && <span style={{ color: '#00C6FF', fontWeight: '600' }}>• CURRENT</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => checkKeyStatus(k)}
                                                    disabled={checkingKeys[k.id]}
                                                    style={{
                                                        background: 'rgba(0, 198, 255, 0.1)',
                                                        border: '1px solid rgba(0, 198, 255, 0.3)',
                                                        borderRadius: '4px',
                                                        padding: '4px 8px',
                                                        color: '#00C6FF',
                                                        fontSize: '0.7rem',
                                                        cursor: checkingKeys[k.id] ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    title="Check Key Status"
                                                >
                                                    <Zap size={10} fill={checkingKeys[k.id] ? 'none' : '#00C6FF'} />
                                                    {checkingKeys[k.id] ? '...' : 'Check'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteKey(k?.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                    title="Delete Key"
                                                >
                                                    <Trash2 size={14} color="#666" className="hover-red" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                            <button
                                onClick={onClose}
                                style={{ padding: '10px 20px', background: '#333', border: '1px solid #444', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary"
                                style={{ padding: '10px 30px' }}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
