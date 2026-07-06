import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext.js";
import { ThemeProvider } from "./lib/ThemeContext.js";
import { ProtectedRoute } from "./lib/ProtectedRoute.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Settings } from "./pages/Settings.js";
import { Profile } from "./pages/Profile.js";
import { Repository } from "./pages/Repository.js";
import { Review } from "./pages/Review.js";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/repository/:id" element={<Repository />} />
                <Route path="/repository/:id/review" element={<Review />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;