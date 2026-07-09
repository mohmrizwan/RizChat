import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import logo from "../assets/images/rizchat-logo-navy-green.png"; // Update your logo path
import Loader from "../components/Loader";
import { connectSocket } from "../Socket/socket";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const submitCall = async (data) => {
    try {
      setLoading(true);

      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(
        `${API_URL}/user/login`,
        data,
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Account Logged In",
          text: response.data.message,
          icon: "success",
        });
        localStorage.setItem("token", response.data.token);
        connectSocket(response.data.token);
        navigate("/MainChat");
      }
    } catch (error) {
      if (error.response) {
        Swal.fire({
          title: "Error",
          text: error.response.data.message,
          icon: "warning",
        });
      } else {
        Swal.fire({
          title: "Server Error",
          text: "Something went wrong",
          icon: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader text="Login your account..." />}

      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="backdrop-blur-xl bg-gray-900/70 border border-gray-700 rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src={logo}
              alt="ChatApp Logo"
              className="w-50 drop-shadow-lg"
            />

            <h1 className="text-3xl font-bold text-green-400 mt-2 tracking-wide">
              Login Account
            </h1>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit(submitCall)}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>

              <div className="flex items-center bg-gray-800 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400">
                <i className="fa fa-envelope text-gray-400 mr-3"></i>

                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-transparent outline-none text-gray-200 placeholder-gray-500 w-full"
                  {...register("email", {
                    required: "Email is required",
                  })}
                />
              </div>

              {errors.email && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>

              <div className="flex items-center bg-gray-800 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-green-400">
                <i className="fa fa-lock text-gray-400 mr-3"></i>

                <input
                  type="password"
                  placeholder="Enter your password"
                  className="bg-transparent outline-none text-gray-200 placeholder-gray-500 w-full"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />

                <i className="fa fa-eye text-gray-400"></i>
              </div>

              {errors.password && (
                <div className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-semibold py-3 rounded-xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Login Account...
                </>
              ) : (
                "Login Account"
              )}
            </button>

            {/* Links */}
            <div className="flex justify-between text-sm text-gray-400 mt-4">
              <Link to="#" className="hover:text-green-400 transition">
                Forgot Password?
              </Link>

              <Link
                to="/createaccount"
                className="hover:text-green-400 transition"
              >
                Create an account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
