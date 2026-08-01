import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Dashboard } from '../pages/Dashboard';
import { Login } from '../pages/Login';

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <Page>
              <Login />
            </Page>
          }
        />
        <Route
          path="/"
          element={
            <Page>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Page>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
