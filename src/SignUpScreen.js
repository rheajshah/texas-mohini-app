import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link } from 'react-router-dom';

import './App.css';
import './SignUpScreen.css';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Dancer');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, 'defaultPassword'); // Using a default password for now
      const user = userCredential.user;
      // Store additional user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName,
        role,
        email
      });
      alert("Sign up successful!");
    } catch (error) {
      console.error("Error signing up:", error);
      alert(error.message);
    }
  };

  return (
    <div className="container">
      <div className="centered-content">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignUp} className="signup-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="displayName">Display Name:</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role:</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="Captain">Captain</option>
              <option value="Dancer">Dancer</option>
            </select>
          </div>
          <button type="submit" className="submit-button">Sign Up</button>
        </form>
        <p className="login-link">Already have an account? <Link to="/">Login</Link></p>
      </div>
    </div>
  );
};

export default SignUpScreen;
