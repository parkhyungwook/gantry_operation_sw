// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import DataSetPage from "./pages/DataSetPage";
import TagPage from "./pages/TagPage";
import TagMonitorPage from "./pages/TagMonitorPage";
import ProcessDemoPage from "./pages/ProcessDemoPage";
import HardwareProfileDemoPage from "./pages/HardwareProfileDemoPage";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <h2 className="nav-logo">PLC Monitor</h2>
            <ul className="nav-menu">
              <li className="nav-item">
                <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}>
                  Monitor
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/datasets" className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}>
                  DataSets
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/tags" className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}>
                  Tags
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/process-demo" className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}>
                  Process Demo
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/hardware-demo" className={({ isActive }) => "nav-link" + (isActive ? " nav-link-active" : "")}>
                  Hardware Demo
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TagMonitorPage />} />
            <Route path="/datasets" element={<DataSetPage />} />
            <Route path="/tags" element={<TagPage />} />
            <Route path="/process-demo" element={<ProcessDemoPage />} />
            <Route path="/hardware-demo" element={<HardwareProfileDemoPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
