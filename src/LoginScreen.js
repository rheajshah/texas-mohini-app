import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link } from 'react-router-dom';

import './App.css';
import './LoginScreen.css';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors
    try {
      await signInWithEmailAndPassword(auth, email, 'defaultPassword');
      navigate('/practices'); // Redirect to practices page on successful login
    } catch (error) {
      console.error('Error logging in:', error);
      setErrorMessage('Invalid credentials'); // Display generic error message
    }
  };

  return (
    <div className="container">
      <div className="centered-content">
        <h2>Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={errorMessage ? 'input-error' : ''}
            />
          </div>
          <button type="submit" className="submit-button">Login</button>
        </form>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <p className="signup-link">Don't have an account? <Link to="/signup">Sign Up</Link></p>
      </div>
    </div>
  );
};

export default LoginScreen;
