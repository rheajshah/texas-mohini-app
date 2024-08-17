import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import PracticeList from './PracticeList';

import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/practices" element={<PracticeList />} />
      </Routes>
    </Router>
  );
};

export default App;
