import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const ValuePreview = ({ value }) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num)) return null;

    return (
        <div style={{
            marginTop: '8px', fontSize: '0.8rem', color: '#00C6FF',
            padding: '6px 10px', background: 'rgba(0,198,255,0.05)',
            borderRadius: '6px', border: '1px border-solid rgba(0,198,255,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
            <span>Formatted: <strong style={{ color: '#fff' }}>{num.toLocaleString()}</strong></span>
            <span style={{ color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {num >= 1_000_000_000 ? `${(num / 1_000_000_000).toFixed(2)}B` :
                    num >= 1_000_000 ? `${(num / 1_000_000).toFixed(2)}M` :
                        num >= 1_000 ? `${(num / 1_000).toFixed(1)}K` :
                            num}
            </span>
        </div>
    );
};

export function CustomFilterModal({ onClose, onAdd }) {
    const [field, setField] = useState('mcap');
    const [operator, setOperator] = useState('<');
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            id: Date.now(),
            field,
            operator,
            value: Number(value)
        });
        onClose();
    };

    const FIELDS = [
        { id: 'mcap', label: 'Market Cap' },
        { id: 'found_at_mcap', label: 'Found At MC' },
        { id: 'holders', label: 'Holders (If available)' },
        { id: 'found_at_holders', label: 'Found At Holders' },
        { id: 'holders_ratio', label: 'Holders Change % (Current vs Found)' },
        { id: 'liquidity', label: 'Liquidity' },
        { id: 'volume', label: 'Volume (24h)' },
        { id: 'change24h', label: 'Change (24h) %' },
        { id: 'price', label: 'Price' },
        { id: 'found_at_minutes', label: 'Found At (minutes ago)' },
        { id: 'found_at_days', label: 'Found At (days ago)' },
        { id: 'created_at_minutes', label: 'Coin Created At (minutes ago)' },
        { id: 'created_at_days', label: 'Coin Created At (days ago)' },
        { id: 'mc_ratio', label: 'MC Change % (Current vs Found)' }
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-card" style={{
                width: '400px',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>Add Custom Filter</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>If</label>
                        <select
                            value={field}
                            onChange={(e) => {
                                const newField = e.target.value;
                                setField(newField);
                                if (['found_at_minutes', 'found_at_days', 'created_at_minutes', 'created_at_days', 'found_at_mcap'].includes(newField)) {
                                    setOperator('<');
                                } else if (['mc_ratio', 'holders_ratio'].includes(newField)) {
                                    setOperator('>');
                                }
                            }}
                            style={{ width: '100%', padding: '10px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white' }}
                        >
                            {FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Is</label>
                        <select
                            value={operator}
                            onChange={(e) => setOperator(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: '#1e1e20', border: '1px solid #333', borderRadius: '6px', color: 'white' }}
                        >
                            <option value="<">Less than</option>
                            <option value=">">Greater than</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Value</label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="e.g. 1000000"
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1e1e20',
                                border: '1px solid #333',
                                borderRadius: '6px',
                                color: 'white'
                            }}
                        />
                        <ValuePreview value={value} />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px' }}>
                        Add Rule
                    </button>
                </form>
            </div>
        </div>
    );
}
