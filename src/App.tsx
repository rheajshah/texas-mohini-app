import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import PracticeList from './PracticeList'; // Update the path as necessary
import './App.css'

const App = () => {
  return (
    <div className="App">
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/practices" element={<PracticeList />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
