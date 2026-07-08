import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import MainChat from "./pages/MainChat";
import UserProfile from "./pages/UserProfile";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import { connectSocket, disconnectSocket } from "./Socket/socket";

const App = () => {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
  }, []);

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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};

export default App;
