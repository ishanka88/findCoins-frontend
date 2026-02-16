import React, { useState, useEffect } from 'react';
import { Terminal, Activity } from 'lucide-react';
import { supabase } from './supabaseClient';

export function BotActivityLog() {
    const [logs, setLogs] = useState([]);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        loadLogs();

        // Subscribe to real-time log updates
        const channel = supabase
            .channel('bot-logs')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bot_logs' },
                (payload) => {
                    setLogs(prev => [payload.new, ...prev].slice(0, 50)); // Keep last 50
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function loadLogs() {
        try {
            const { data, error } = await supabase
                .from('bot_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (data) setLogs(data);
            if (error) throw error;
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    const getLogColor = (type) => {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return '#888';
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false });
    };

    return (
        <div style={{
            background: '#0a0a0b',
            border: '1px solid #222',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '12px 16px',
                    background: '#121214',
                    borderBottom: '1px solid #222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={16} color="#00C6FF" />
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Bot Activity</span>
                    {logs.length > 0 && (
                        <span style={{
                            background: '#00C6FF',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            {logs.length}
                        </span>
                    )}
                </div>
                <Activity size={14} color="#666" className={isExpanded ? '' : 'rotate-180'} />
            </div>

            {isExpanded && (
                <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    padding: '8px'
                }}>
                    {logs.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            No activity logs yet. Bot will appear here when running.
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div
                                key={log.id || idx}
                                style={{
                                    padding: '6px 8px',
                                    borderBottom: idx < logs.length - 1 ? '1px solid #1a1a1a' : 'none',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <span style={{ color: '#555', minWidth: '60px' }}>
                                    {formatTime(log.timestamp)}
                                </span>
                                <span style={{
                                    color: getLogColor(log.log_type),
                                    minWidth: '50px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    fontSize: '0.7rem'
                                }}>
                                    {log.log_type}
                                </span>
                                {log.strategy_name && (
                                    <span style={{ color: '#666', minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        [{log.strategy_name}]
                                    </span>
                                )}
                                <span style={{ color: '#ccc', flex: 1 }}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
