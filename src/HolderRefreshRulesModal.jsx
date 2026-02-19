import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Zap, ToggleLeft, ToggleRight, Info, Edit2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { formatNumberWithSuffix, parseNumberWithSuffix } from './utils/formatters';

const CONDITION_FIELDS = [
    { value: 'mcap', label: 'Market Cap' },
    { value: 'holders', label: 'Holders' },
    { value: 'volume', label: 'Volume' },
];

const CONDITION_OPERATORS = [
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'eq', label: '=' },
    { value: 'between', label: 'Between' },
];

const inputStyle = {
    padding: '8px 12px',
    background: '#1e1e20',
    border: '1px solid #333',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
};

const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: '28px',
};

export function HolderRefreshRulesModal({ onClose, strategies }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        condition_field: 'mcap',
        condition_operator: 'gt',
        condition_value: '1M',
        condition_value_high: '5M',
        refresh_interval_minutes: 60,
        max_tokens_per_cycle: 20,
        strategy_ids: [],
        allStrategies: true,
        priority: 100,
        action: 'refresh'
    });

    useEffect(() => {
        loadRules();
    }, []);

    async function loadRules() {
        try {
            const { data, error } = await supabase
                .from('holder_refresh_rules')
                .select('*')
                .order('priority', { ascending: true })
                .order('name', { ascending: true });
            if (data) setRules(data);
            if (error) throw error;
        } catch (e) {
            console.error('Error loading rules:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddRule() {
        setSaving(true);
        try {
            const ruleData = {
                name: newRule.name,
                condition_field: newRule.condition_field,
                condition_operator: newRule.condition_operator,
                condition_value: parseNumberWithSuffix(newRule.condition_value),
                condition_value_high: newRule.condition_operator === 'between' ? parseNumberWithSuffix(newRule.condition_value_high) : null,
                refresh_interval_minutes: Number(newRule.refresh_interval_minutes),
                max_tokens_per_cycle: Number(newRule.max_tokens_per_cycle),
                strategy_ids: newRule.allStrategies ? [] : newRule.strategy_ids,
                priority: Number(newRule.priority || 100),
                action: newRule.action || 'refresh',
            };

            let error;
            if (editingId) {
                const { error: err } = await supabase.from('holder_refresh_rules').update(ruleData).eq('id', editingId);
                error = err;
            } else {
                const { error: err } = await supabase.from('holder_refresh_rules').insert(ruleData);
                error = err;
            }

            if (error) throw error;

            setShowAddForm(false);
            setEditingId(null);
            setNewRule({
                name: '', condition_field: 'mcap', condition_operator: 'gt',
                condition_value: '1M', condition_value_high: '5M',
                refresh_interval_minutes: 60,
                max_tokens_per_cycle: 20, strategy_ids: [], allStrategies: true,
                priority: 100, action: 'refresh'
            });
            await loadRules();
        } catch (e) {
            console.error('Error saving rule:', e);
            alert('Failed to save rule: ' + e.message);
        } finally {
            setSaving(false);
        }
    }

    function editRule(rule) {
        setEditingId(rule.id);
        setNewRule({
            name: rule.name,
            condition_field: rule.condition_field,
            condition_operator: rule.condition_operator,
            condition_value: formatNumberWithSuffix(rule.condition_value).replace(/,/g, ''),
            condition_value_high: rule.condition_value_high ? formatNumberWithSuffix(rule.condition_value_high).replace(/,/g, '') : '5M',
            refresh_interval_minutes: rule.refresh_interval_minutes,
            max_tokens_per_cycle: rule.max_tokens_per_cycle,
            strategy_ids: rule.strategy_ids || [],
            allStrategies: !rule.strategy_ids || rule.strategy_ids.length === 0,
            priority: rule.priority,
            action: rule.action || 'refresh'
        });
        setShowAddForm(true);
    }

    async function toggleRule(ruleId, currentState) {
        try {
            await supabase.from('holder_refresh_rules').update({ is_active: !currentState }).eq('id', ruleId);
            setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !currentState } : r));
        } catch (e) {
            console.error('Toggle error:', e);
        }
    }

    async function deleteRule(ruleId) {
        if (!window.confirm('Delete this rule?')) return;
        try {
            await supabase.from('holder_refresh_rules').delete().eq('id', ruleId);
            setRules(prev => prev.filter(r => r.id !== ruleId));
        } catch (e) {
            console.error('Delete error:', e);
        }
    }

    function handleStrategyToggle(stratId) {
        setNewRule(prev => {
            const ids = prev.strategy_ids.includes(stratId)
                ? prev.strategy_ids.filter(id => id !== stratId)
                : [...prev.strategy_ids, stratId];
            return { ...prev, strategy_ids: ids, allStrategies: false };
        });
    }

    function formatCondition(rule) {
        const field = CONDITION_FIELDS.find(f => f.value === rule.condition_field)?.label || rule.condition_field;
        const op = CONDITION_OPERATORS.find(o => o.value === rule.condition_operator)?.label || rule.condition_operator;
        const formatVal = (val) => formatNumberWithSuffix(val);
        const actionLabel = rule.action === 'skip' ? 'SKIP' : '';

        const labelStyle = { color: '#ff5050', fontWeight: 'bold', marginRight: '6px' };

        if (rule.condition_operator === 'between') {
            return (
                <span>
                    {actionLabel && <span style={labelStyle}>{actionLabel}</span>}
                    {field} between {formatVal(rule.condition_value)} and {formatVal(rule.condition_value_high)}
                </span>
            );
        }

        return (
            <span>
                {actionLabel && <span style={labelStyle}>{actionLabel}</span>}
                {field} {op} {formatVal(rule.condition_value)}
            </span>
        );
    }

    function formatStrategies(rule) {
        if (!rule.strategy_ids || rule.strategy_ids.length === 0) return 'All';
        return rule.strategy_ids.map(id => {
            const s = strategies?.find(st => st.id === id);
            return s ? s.name : id.slice(0, 8);
        }).join(', ');
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '620px', maxHeight: '80vh', overflow: 'auto',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={20} color="#00C6FF" />
                        <h3 style={{ margin: 0, color: 'white' }}>Holder Refresh Rules</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '20px', lineHeight: 1.5 }}>
                    Define conditions for automatic holder count updates. The bot checks these rules after each scrape cycle
                    and fetches holders in the background without slowing down scraping.
                </p>

                {/* Existing Rules */}
                {loading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Loading...</div>
                ) : rules.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '0.85rem' }}>
                        No rules yet. Add one to start auto-refreshing holders.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {rules.map(rule => (
                            <div key={rule.id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px', border: `1px solid ${rule.is_active ? '#2a2a2d' : '#1a1a1c'}`,
                                opacity: rule.is_active ? 1 : 0.5,
                                transition: 'opacity 0.2s'
                            }}>
                                <button
                                    onClick={() => toggleRule(rule.id, rule.is_active)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                    title={rule.is_active ? 'Disable' : 'Enable'}
                                >
                                    {rule.is_active
                                        ? <ToggleRight size={22} color="#00C6FF" />
                                        : <ToggleLeft size={22} color="#444" />
                                    }
                                </button>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '3px' }}>
                                        <span style={{ color: '#00C6FF', marginRight: '6px' }}>#{rule.priority ?? 100}</span>
                                        {rule.name}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.75rem' }}>
                                        {formatCondition(rule)} → {rule.action === 'skip' ? 'Exclude from update' : `every ${rule.refresh_interval_minutes}m · max ${rule.max_tokens_per_cycle}/cycle`} · {formatStrategies(rule)}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => editRule(rule)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        title="Edit Rule"
                                    >
                                        <Edit2 size={14} color="#888" />
                                    </button>
                                    <button
                                        onClick={() => deleteRule(rule.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        title="Delete Rule"
                                    >
                                        <Trash2 size={14} color="#ff5050" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Rule Form */}
                {showAddForm ? (
                    <div style={{
                        padding: '16px', background: 'rgba(0,198,255,0.03)',
                        borderRadius: '8px', border: '1px solid #2a2a2d', marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '80px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Priority</label>
                                <input
                                    type="number"
                                    placeholder="100"
                                    value={newRule.priority}
                                    onChange={e => setNewRule(prev => ({ ...prev, priority: e.target.value }))}
                                    style={{ ...inputStyle, width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Rule Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Large Cap Hourly"
                                    value={newRule.name}
                                    onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ ...inputStyle, width: '100%' }}
                                />
                            </div>
                            <div style={{ width: '140px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Action</label>
                                <select
                                    value={newRule.action}
                                    onChange={e => setNewRule(prev => ({ ...prev, action: e.target.value }))}
                                    style={{ ...selectStyle, width: '100%' }}
                                >
                                    <option value="refresh">Refresh Holders</option>
                                    <option value="skip">Do Not Refresh</option>
                                </select>
                            </div>
                        </div>

                        {/* Condition Row */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>When</label>
                                <select
                                    value={newRule.condition_field}
                                    onChange={e => setNewRule(prev => ({ ...prev, condition_field: e.target.value }))}
                                    style={{ ...selectStyle, width: '100%' }}
                                >
                                    {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                            </div>
                            <div style={{ width: '90px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Op</label>
                                <select
                                    value={newRule.condition_operator}
                                    onChange={e => setNewRule(prev => ({ ...prev, condition_operator: e.target.value }))}
                                    style={{ ...selectStyle, width: '100%' }}
                                >
                                    {CONDITION_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>
                                    {newRule.condition_operator === 'between' ? 'Min Value' : 'Value'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1M or 500K"
                                        value={newRule.condition_value}
                                        onChange={e => setNewRule(prev => ({ ...prev, condition_value: e.target.value }))}
                                        style={{ ...inputStyle, width: '100%' }}
                                    />
                                    <div style={{
                                        position: 'absolute', right: 0, top: '100%',
                                        color: '#00C6FF', fontSize: '0.7rem', marginTop: '4px', textAlign: 'right',
                                        fontWeight: 600
                                    }}>
                                        = {formatNumberWithSuffix(parseNumberWithSuffix(newRule.condition_value))}
                                    </div>
                                </div>
                            </div>

                            {newRule.condition_operator === 'between' && (
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Max Value</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="e.g. 5M"
                                            value={newRule.condition_value_high}
                                            onChange={e => setNewRule(prev => ({ ...prev, condition_value_high: e.target.value }))}
                                            style={{ ...inputStyle, width: '100%' }}
                                        />
                                        <div style={{
                                            position: 'absolute', right: 0, top: '100%',
                                            color: '#00C6FF', fontSize: '0.7rem', marginTop: '4px', textAlign: 'right',
                                            fontWeight: 600
                                        }}>
                                            = {formatNumberWithSuffix(parseNumberWithSuffix(newRule.condition_value_high))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Interval + Batch Row */}
                        {newRule.action === 'refresh' && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', marginTop: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Refresh Interval (min)</label>
                                    <input
                                        type="number" min="5" max="1440"
                                        value={newRule.refresh_interval_minutes}
                                        onChange={e => setNewRule(prev => ({ ...prev, refresh_interval_minutes: e.target.value }))}
                                        style={{ ...inputStyle, width: '100%' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '4px' }}>Max Tokens/Cycle</label>
                                    <input
                                        type="number" min="1" max="100"
                                        value={newRule.max_tokens_per_cycle}
                                        onChange={e => setNewRule(prev => ({ ...prev, max_tokens_per_cycle: e.target.value }))}
                                        style={{ ...inputStyle, width: '100%' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Strategy Checkboxes */}
                        <div style={{ marginBottom: '14px', marginTop: newRule.action === 'skip' ? '20px' : '0' }}>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: '6px' }}>Apply to Strategies</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newRule.allStrategies}
                                        onChange={e => setNewRule(prev => ({ ...prev, allStrategies: e.target.checked, strategy_ids: [] }))}
                                        style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#00C6FF' }}
                                    />
                                    <span style={{ color: '#ccc', fontSize: '0.82rem' }}>All Strategies</span>
                                </label>
                                {strategies?.map(s => (
                                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: newRule.allStrategies ? 0.4 : 1 }}>
                                        <input
                                            type="checkbox"
                                            checked={newRule.strategy_ids.includes(s.id)}
                                            onChange={() => handleStrategyToggle(s.id)}
                                            disabled={newRule.allStrategies}
                                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#00C6FF' }}
                                        />
                                        <span style={{ color: '#ccc', fontSize: '0.82rem' }}>{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingId(null);
                                }}
                                style={{ padding: '8px 16px', background: '#333', border: '1px solid #444', borderRadius: '6px', color: '#ccc', cursor: 'pointer', fontSize: '0.82rem' }}
                            >Cancel</button>
                            <button
                                onClick={handleAddRule}
                                disabled={saving || !newRule.name}
                                className="btn-primary"
                                style={{ padding: '8px 20px', fontSize: '0.82rem', opacity: !newRule.name ? 0.5 : 1 }}
                            >{saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Rule')}</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewRule({
                                name: '', condition_field: 'mcap', condition_operator: 'gt',
                                condition_value: '1M', condition_value_high: '5M',
                                refresh_interval_minutes: 60,
                                max_tokens_per_cycle: 20, strategy_ids: [], allStrategies: true,
                                priority: 100, action: 'refresh'
                            });
                            setShowAddForm(true);
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                            padding: '10px', background: 'rgba(0,198,255,0.05)',
                            border: '1px dashed #2a2a2d', borderRadius: '8px',
                            color: '#00C6FF', cursor: 'pointer', fontSize: '0.85rem',
                            justifyContent: 'center', marginBottom: '16px'
                        }}
                    >
                        <Plus size={16} /> Add Rule
                    </button>
                )}

                {/* Close */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 24px', background: '#333', border: '1px solid #444', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                    >Close</button>
                </div>
            </div>
        </div>
    );
}
