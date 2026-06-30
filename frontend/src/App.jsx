import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import MainChat from "./pages/mainChat";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

const App = () => {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/CreateAccount" element={<CreateAccount />} />
        <Route
          path="/MainChat"
          element={
            <ProtectedRoute>
              <MainChat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};

export default App;
