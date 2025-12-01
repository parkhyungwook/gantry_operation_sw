import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import MonitorPage from "./pages/MonitorPage";

import MainPage from "./pages/MainPage";
import HardwareDefinitionPage from "./pages/HardwareDefinitionPage";
import HardwareDefinitionAddPage from "./pages/HardwareDefinitionAddPage";
import HardwareDefinitionEditPage from "./pages/HardwareDefinitionEditPage";

import ProcessPage from "./pages/ProcessPage";
import ProcessEditPage from "./pages/ProcessEditPage";
import DiagnosisPage from "./pages/DiagnosisPage";
import SettingPage from "./pages/SettingPage";
import ProcessAddPage from "./pages/ProcessAddPage";
import AddressMonitorPage from "./pages/AddressMonitorPage";
import AddressMonitorSettingsPage from "./pages/AddressMonitorSettingsPage";
import "./App.css";

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <Router>
      <div className="App">
        {/* Top navbar */}
        <nav className="navbar">
          <button className="menu-btn" onClick={toggleSidebar}>
            ☰
          </button>
          <img src="/logo.png" alt="Logo" className="nav-logo-img" />
        </nav>

        {/* Sidebar */}
        <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ×
          </button>
          <ul>
            <li>
              <Link to="/" onClick={toggleSidebar}>
                Home (Monitoring)
              </Link>
            </li>
            <li>
              <Link to="/hardware" onClick={toggleSidebar}>
                Hardware Definition
              </Link>
            </li>
            <li>
              <Link to="/process" onClick={toggleSidebar}>
                Process
              </Link>
            </li>
            <li>
              <Link to="/datasets" onClick={toggleSidebar}>
                DataSets
              </Link>
            </li>
            <li>
              <Link to="/diagnosis" onClick={toggleSidebar}>
                Diagnosis
              </Link>
            </li>
            <li>
              <Link to="/address-monitor" onClick={toggleSidebar}>
                Address Monitor
              </Link>
            </li>
            <li>
              <Link to="/setting" onClick={toggleSidebar}>
                Setting
              </Link>
            </li>
            <li>
              <Link to="/monitor" onClick={toggleSidebar}>
                TEST1 : Monitor
              </Link>
            </li>
            <li>
              <Link to="/register" onClick={toggleSidebar}>
                TEST2 : Register Data Point
              </Link>
            </li>
          </ul>
        </div>

        {/* Main content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Hardware Definition */}
            <Route path="/hardware" element={<HardwareDefinitionPage />} />
            <Route path="/hardware/edit/:id" element={<HardwareDefinitionEditPage />} />
            <Route path="/hardware/add" element={<HardwareDefinitionAddPage />} />

            <Route path="/process" element={<ProcessPage />} />
            <Route path="/process/add" element={<ProcessAddPage />} />
            <Route path="/process/edit/:id" element={<ProcessEditPage />} />
            <Route path="/diagnosis" element={<DiagnosisPage />} />
            <Route path="/address-monitor" element={<AddressMonitorPage />} />
            <Route path="/address-monitor/settings" element={<AddressMonitorSettingsPage />} />
            <Route path="/setting" element={<SettingPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
