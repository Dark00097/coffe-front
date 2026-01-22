import { useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import { v4 as uuidv4 } from 'uuid';
import './css/Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      const { user, token } = res.data;
      if (!user || !user.id || !user.email || !user.role) {
        throw new Error('Invalid user data received from server');
      }
      if (!token || typeof token !== 'string' || token === 'null' || token === 'undefined') {
        throw new Error('Invalid or missing token received from server');
      }
      localStorage.setItem('jwt_token', token);
      const sessionId = `user-${user.id}-${uuidv4()}`;
      localStorage.setItem('sessionId', sessionId);
      api.defaults.headers.common['X-Session-Id'] = sessionId;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Login successful', { user: { id: user.id, email: user.email, role: user.role }, token: token.substring(0, 10) + '...', sessionId });
      toast.success('Logged in successfully');
      onLogin(user, token);
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Login failed');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      delete api.defaults.headers.common['X-Session-Id'];
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow--tl"></div>
      <div className="login-glow login-glow--br"></div>
      <div className="login-shell">
        <div className="login-panel login-panel--hero">
          <div className="login-crest">LC</div>
          <h1 className="login-hero-title">Welcome back to the command center</h1>
          <p className="login-hero-copy">
            Stay on top of live orders, reservations, breakfast builds, and staff alerts in one clean cockpit.
          </p>
          <div className="login-pill-row">
            <span className="login-pill">Live tickets</span>
            <span className="login-pill">Tables & stock</span>
            <span className="login-pill">Secure sessions</span>
          </div>
          <div className="login-footnotes">
            <span>🔒 Staff-only access</span>
            <span>🛰 Real-time socket feed</span>
          </div>
        </div>

        <div className="login-panel login-panel--form">
          <div className="login-form-head">
            <div className="login-lock">
              <LoginIcon />
            </div>
            <div>
              <p className="login-kicker">Sign in</p>
              <h2 className="login-title">Order & floor control</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span className="login-label">Work email</span>
              <div className={`login-input-shell ${focusedField === 'email' ? 'is-focused' : ''}`}>
                <EmailIcon className="login-field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <div className={`login-input-shell ${focusedField === 'password' ? 'is-focused' : ''}`}>
                <LockIcon className="login-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="login-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </button>
              </div>
            </label>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`login-submit ${isLoading ? 'login-submit--disabled' : ''}`}
            >
              {isLoading && <div className="login-spinner"></div>}
              {isLoading ? 'Signing in…' : 'Access dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
