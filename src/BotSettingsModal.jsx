import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2, Plus } from 'lucide-react';
import { supabase } from './supabaseClient';

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
                                <h4 style={{ margin: 0, color: '#00C6FF', fontSize: '0.95rem' }}>Moralis API Keys</h4>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Total Requests: {totalUsage}</span>
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
                                                    <div style={{ fontSize: '0.7rem', color: k?.status === 'active' ? '#10b981' : '#ef4444', textTransform: 'uppercase', fontWeight: '600' }}>
                                                        {k?.status} • {k?.usage_count || 0} reqs {k?.is_current && <span style={{ color: '#00C6FF', marginLeft: '4px' }}>• CURRENT</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteKey(k?.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                title="Delete Key"
                                            >
                                                <Trash2 size={14} color="#666" className="hover-red" />
                                            </button>
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
