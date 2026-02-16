import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from './supabaseClient';

export function BotSettingsModal({ onClose }) {
    const [settings, setSettings] = useState({
        scraping_interval_seconds: 60,
        max_tokens_per_strategy: 100,
        enable_holder_check: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const { data, error } = await supabase
                .from('bot_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (data) {
                setSettings(data);
            }
            if (error) throw error;
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('bot_settings')
                .update({
                    scraping_interval_seconds: Number(settings.scraping_interval_seconds),
                    max_tokens_per_strategy: Number(settings.max_tokens_per_strategy),
                    enable_holder_check: settings.enable_holder_check
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

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '500px',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SettingsIcon size={20} color="#00C6FF" />
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
                                value={settings.scraping_interval_seconds}
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
                                value={settings.max_tokens_per_strategy}
                                onChange={(e) => setSettings({ ...settings, max_tokens_per_strategy: e.target.value })}
                                style={{ width: '100%', padding: '10px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.8rem' }}>Maximum tokens to process per strategy per interval</small>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.enable_holder_check}
                                    onChange={(e) => setSettings({ ...settings, enable_holder_check: e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Enable Holder Count Check</span>
                            </label>
                            <small style={{ color: '#666', fontSize: '0.8rem', marginLeft: '28px' }}>Fetch holder counts via Moralis API (requires API key)</small>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
