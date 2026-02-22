import React from 'react';
import { X, RefreshCw, Plus } from 'lucide-react';

export function SaveViewOptionsModal({ onClose, onUpdate, onSaveAsNew, viewName }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
            <div className="glass-card" style={{
                width: '400px',
                background: '#121214', border: '1px solid #2a2a2d', borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>Save Filter View</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '24px' }}>
                    You have modified the <strong>{viewName}</strong> filter. Would you like to update the existing view or save it as a new one?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={onUpdate}
                        className="btn-primary"
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px'
                        }}
                    >
                        <RefreshCw size={18} /> Update Current View
                    </button>

                    <button
                        onClick={onSaveAsNew}
                        className="btn-secondary"
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px'
                        }}
                    >
                        <Plus size={18} /> Save as New View
                    </button>
                </div>
            </div>
        </div>
    );
}
