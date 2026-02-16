import React, { useState } from 'react';
import { Lock, Zap } from 'lucide-react';

export function Login({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate slight delay for better UX
        setTimeout(() => {
            const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'defaultpass123';

            if (password === correctPassword) {
                // Store auth token in localStorage for persistent login
                localStorage.setItem('findcoins_auth', 'authenticated');
                onLogin();
            } else {
                setError('Incorrect password. Please try again.');
                setPassword('');
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%)',
            padding: '20px'
        }}>
            <div className="glass-card" style={{
                maxWidth: '400px',
                width: '100%',
                padding: '40px',
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{
                    background: 'var(--primary-gradient)',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    marginBottom: '24px'
                }}>
                    <Zap color="white" size={32} />
                </div>

                {/* Title */}
                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    marginBottom: '8px',
                    background: 'var(--primary-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.5px'
                }}>
                    SOLANA SNIPER
                </h1>

                <p style={{
                    color: '#888',
                    fontSize: '0.9rem',
                    marginBottom: '32px'
                }}>
                    Enter password to access dashboard
                </p>

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <Lock
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#666'
                            }}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoFocus
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(255,255,255,0.05)',
                                border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'all 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                if (!error) {
                                    e.target.style.borderColor = 'rgba(0, 198, 255, 0.5)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 198, 255, 0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                if (!error) {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '10px',
                            marginBottom: '20px',
                            color: '#ef4444',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            opacity: (isLoading || !password) ? 0.5 : 1,
                            cursor: (isLoading || !password) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Authenticating...' : 'Access Dashboard'}
                    </button>
                </form>

                {/* Footer */}
                <p style={{
                    marginTop: '24px',
                    fontSize: '0.75rem',
                    color: '#666'
                }}>
                    🔒 Secure access • Session persists until logout
                </p>
            </div>
        </div>
    );
}
