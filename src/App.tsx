import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import PracticeList from './PracticeList'; // Update the path as necessary
import './App.css';

const App = () => {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/practices" element={<PracticeList />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;
