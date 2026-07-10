import React, { useState, useEffect } from "react";
import rizwan from "../assets/images/rizwan.jpg";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const UserProfile = () => {
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(rizwan);
  const [user, setUser] = useState([]);
  const [refresh, setRefresh] = useState(false);

  const getMediaUrl = (value) => {
    if (!value) return null;
    return /^https?:\/\//i.test(value) ? value : `${API_URL}/${value}`;
  };

  const submitCall = async () => {
    try {
      const formData = new FormData();

      formData.append("name", name);

      if (selectedFile) {
        formData.append("profilePic", selectedFile);
      }

      const response = await axios.put(
        `${API_URL}/user/updateProfile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Profile Updated Successfully",
      });
      setRefresh((prev) => !prev);
      setIsEditing(false);
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  useEffect(() => {
    getProfile();
  }, [refresh]);

  const getProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data.user);
      // console.log(response.data.user);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 py-10 font-inter">
      <div className="w-full max-w-md bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* ===== Header ===== */}
        <div className="h-32 relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950">
          {/* Background layer — clipped separately so it never cuts off the avatar */}
          <div className="absolute inset-0 overflow-hidden rounded-t-3xl">
            {/* Signature glow — soft green spotlight behind the avatar */}
            <div className="absolute -bottom-10 left-2 w-40 h-40 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Faint dot texture for depth */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
          </div>

          {/* Back button */}
          <Link
            to="/"
            className="absolute top-4 left-4 flex items-center justify-center w-9 h-9 bg-gray-950/60 hover:bg-gray-800 text-gray-200 rounded-full shadow-md ring-1 ring-white/5 transition hover:scale-105"
            aria-label="Back to chats"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          {/* Edit toggle */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-gray-950/60 hover:bg-gray-800 text-gray-200 text-xs font-medium px-3.5 py-2 rounded-full shadow-md ring-1 ring-white/5 transition hover:scale-105"
            >
              <i className="fa fa-pencil text-green-400"></i>
              Edit
            </button>
          )}

          {/* Profile photo */}
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full ring-[3px] ring-gray-900 shadow-[0_0_0_4px_rgba(74,222,128,0.15)] overflow-hidden bg-gray-800 flex items-center justify-center">
                <img
                  src={user.profilePic ? getMediaUrl(user.profilePic) : rizwan}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Online dot */}
              <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 rounded-full ring-[3px] ring-gray-900" />

              {/* Camera button — wire onClick to open file picker / upload */}
              <button
                type="button"
                onClick={() => document.getElementById("profilePic").click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shadow-lg ring-2 ring-gray-900 transition hover:scale-105"
              />
            </div>
            <input
              id="profilePic"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files[0];

                if (file) {
                  setSelectedFile(file);
                  setPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>
        </div>

        {/* ===== Body ===== */}
        <div className="pt-16 px-7 pb-7">
          {!isEditing ? (
            /* ---------------- VIEW MODE ---------------- */
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-50 tracking-tight truncate">
                  {user.name}
                </h2>
                <p className="text-xs mt-1 text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online
                </p>
              </div>

              <div className="h-px bg-gradient-to-r from-gray-800 via-gray-800/60 to-transparent" />

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa fa-envelope text-green-400 text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-0.5">
                      Email
                    </p>
                    <p className="text-sm text-gray-200 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa fa-info-circle text-green-400 text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-0.5">
                      About
                    </p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                      Hey there! I'm using RizChat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------------- EDIT MODE ---------------- */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitCall();
              }}
              className="space-y-5"
            >
              <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-500 mb-1.5 block">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-gray-800/30 text-gray-500 rounded-xl px-4 py-3 outline-none border border-gray-800"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-500 mb-1.5 block">
                  Email
                </label>
                <input
                  type="text"
                  defaultValue={user.email}
                  disabled
                  className="w-full bg-gray-800/30 text-gray-500 rounded-xl px-4 py-3 outline-none border border-gray-800 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Email can't be changed here.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  // TODO: reset drafts back to original values here
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl shadow-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl"
                >
                  Save changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
