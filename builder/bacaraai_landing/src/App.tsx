/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { PlatformAuthProvider } from './hooks/usePlatformAuth';

export default function App() {
  return (
    <PlatformAuthProvider>
      <HashRouter>
        <Routes>
          {/* 루트 = 플랫폼 로그인, 소개/랜딩은 /about */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </HashRouter>
    </PlatformAuthProvider>
  );
}
