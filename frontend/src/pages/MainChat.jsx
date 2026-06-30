// src/pages/MainChat.jsx
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Loader from "../components/Loader";
import socket from "../socket/socket";
import rizwan from "../assets/images/rizwan.jpg";
import { jwtDecode } from "jwt-decode";

const MainChat = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [voiceCall, setVoiceCall] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [showChats, setShowChats] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [allRooms, setallRooms] = useState([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomCode, setroomCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const token = localStorage.getItem("token");
  const currentUserId = token ? jwtDecode(token).id : null;
  const chats = [];
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const memberIds = new Set(selectedRoom?.members.map((m) => m._id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u._id));
  const [replyingTo, setReplyingTo] = useState(null);
  // WhatsApp-style mobile view: "list" shows sidebar, "chat" shows the open conversation
  const [mobileView, setMobileView] = useState("list");
  // Group info panel toggle. Hidden by default on every breakpoint now (including
  // large screens), and opened explicitly via the "Group details" button in the
  // chat header so there's always an obvious, consistent way to reach it.
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const handleReply = (msg) => {
    setReplyingTo(msg);
  };

  const handleDelete = async (messageId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:3000/message/deleteMessage/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const handleAddMember = async (user) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3000/room/addMember",
        {
          roomId: selectedRoom._id,
          userId: user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: response.data.message,
      });

      setShowAddMemberModal(false);

      getRooms();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const getUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:3000/user/allUsers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setAllUsers(response.data);
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Something went wrong",
        icon: "error",
      });
    }
  };

  useEffect(() => {
    if (showAddMemberModal) {
      getUsers();
    }
  }, [showAddMemberModal]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:3000/user/logout");
      if (response.status === 200) {
        Swal.fire({
          title: "Account Logout",
          text: response.data.message,
          icon: "success",
        });

        socket.disconnect();
        navigate("/");
      }
      localStorage.removeItem("token");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;

    socket.emit("joinRoom", selectedRoom._id);
  }, [selectedRoom]);

  useEffect(() => {
    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  useEffect(() => {
    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => socket.off("messageDeleted");
  }, []);

  useEffect(() => {
    socket.on("memberAdded", (updatedRoom) => {
      setSelectedRoom(updatedRoom);
    });

    return () => socket.off("memberAdded");
  }, []);

  useEffect(() => {
    socket.on("memberLeft", ({ roomId, userId, updatedRoom }) => {
      if (userId === currentUserId) {
        setSelectedRoom(null);
        setMessages([]);
        setMobileView("list");
      }

      setallRooms((prev) => prev.filter((room) => room._id !== roomId));

      setSelectedRoom(updatedRoom);
    });

    return () => socket.off("memberLeft");
  }, [currentUserId]);

  const createRoom = async () => {
    try {
      setRoomLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3000/room/createRoom",
        {
          roomName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Swal.fire({
        title: "Room Created",
        text: `Room Code: ${response.data.room.roomCode}`,
        icon: "success",
      });
      setRoomName("");
      getRooms();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Something went wrong",
        icon: "error",
      });
    } finally {
      setRoomLoading(false);
    }
  };

  const getRooms = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get("http://localhost:3000/room/allRooms", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setallRooms(response.data.myRooms);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getRooms();
  }, []);

  const joinRoom = async () => {
    try {
      let token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3000/room/joinRoom",
        {
          roomCode,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200)
        Swal.fire({
          icon: "success",
          title: "Success",
          text: response.data.message,
        });
      setShowJoinRoom(false);
      setroomCode("");

      getRooms();
    } catch (error) {
      console.log(error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
      setShowJoinRoom(false);
    }
  };

  const leaveRoom = async () => {
    try {
      let token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3000/room/leaveRoom",
        {
          roomId: selectedRoom._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Room Leave",
          text: response.data.message,
          icon: "success",
        });
      }
      getRooms();
      setSelectedRoom(null);
      setMobileView("list");
      setShowGroupInfo(false);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const sendMessage = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:3000/message/sendMessage",
        {
          roomId: selectedRoom._id,
          text: text,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setText("");
      setReplyingTo(null);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const getMessages = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:3000/message/getMessages/${selectedRoom._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setMessages(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      getMessages();
    } else {
      setMessages([]);
    }
  }, [selectedRoom]);

  const isSeen = async (roomId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `http://localhost:3000/message/seen/${roomId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    setMobileView("chat");
    setShowGroupInfo(false);
    await isSeen(room._id);
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  return (
    <>
      {loading && <Loader text="Logout your account..." />}
      <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-200 font-inter">
        {/* ===================== Sidebar (rooms list) ===================== */}
        <aside
          className={`
            w-full sm:w-80 md:w-72 lg:w-80 border-r border-gray-800 flex-col bg-gray-900/80 backdrop-blur-xl shrink-0
            ${mobileView === "list" ? "flex" : "hidden"} md:flex
          `}
        >
          <div className="p-4 sm:p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-green-400 tracking-wide">
              ChatApp
            </h2>
            <input
              type="text"
              placeholder="Search..."
              className="mt-4 w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-2 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400 uppercase">View</div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowChats(true)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    showChats
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                  aria-pressed={showChats}
                >
                  Chats
                </button>
                <button
                  onClick={() => setShowChats(false)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    !showChats
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                  aria-pressed={!showChats}
                >
                  Groups
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {showChats ? (
              <>
                <h3 className="text-sm uppercase text-gray-400 mb-2">Chats</h3>
                {chats.length === 0 ? (
                  <p className="text-sm text-gray-500">No chats yet.</p>
                ) : (
                  chats.map((chat, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 cursor-pointer transition-transform transform hover:scale-105 shadow-md hover:shadow-green-500/30"
                    >
                      {chat}
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                <h3 className="text-sm uppercase text-gray-400 mb-2">Groups</h3>
                {allRooms.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No groups yet — create or join one below.
                  </p>
                ) : (
                  allRooms.map((room) => (
                    <div
                      key={room._id}
                      onClick={() => handleSelectRoom(room)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-transform transform hover:scale-[1.02] shadow-md hover:shadow-green-500/30 ${
                        selectedRoom?._id === room._id
                          ? "bg-gray-700 ring-1 ring-green-500/40"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      <img
                        src={rizwan}
                        alt={room.roomName}
                        className="w-10 h-10 rounded-full ring-1 ring-gray-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{room.roomName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {room.roomCode}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-800 space-y-3">
            <button
              onClick={() => setShowCreateRoom(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg shadow-md"
            >
              Create Room
            </button>
            <button
              onClick={() => setShowJoinRoom(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg shadow-md"
            >
              Join Group
            </button>
            <button
              type="submit"
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center justify-center bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg transition-transform transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Logout Account...
                </>
              ) : (
                "Logout "
              )}
            </button>
          </div>
        </aside>

        {/* ===================== Main chat column ===================== */}
        <main
          className={`
            flex-1 flex-col relative min-w-0
            ${mobileView === "chat" ? "flex" : "hidden"} md:flex
          `}
        >
          {showCreateRoom && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-green-400">
                  Create Room
                </h3>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-2 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateRoom(false);
                      setRoomName("");
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await createRoom();
                      setShowCreateRoom(false);
                    }}
                    disabled={roomLoading}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {roomLoading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showJoinRoom && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-blue-400">Join Room</h3>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setroomCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-2 outline-none placeholder-gray-500 focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowJoinRoom(false);
                      setroomCode("");
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={joinRoom}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedRoom ? (
            <>
              <header className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-800 bg-gray-900/90 backdrop-blur-xl shadow-lg gap-2">
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden text-gray-300 hover:text-green-400 transition p-1 -ml-1 shrink-0"
                    aria-label="Back to chats"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowGroupInfo(true)}
                    className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 text-left"
                    aria-label="Open group details"
                  >
                    <img
                      src={rizwan}
                      alt="User"
                      className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full ring-2 ring-green-400 shadow-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                        {selectedRoom.roomName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">
                        Room Code: {selectedRoom.roomCode || "------"}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 shrink-0">
                  <button
                    onClick={() => setVoiceCall(true)}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Start audio call"
                  >
                    <i className="fa fa-phone text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Audio</span>
                  </button>

                  <button
                    onClick={() => setVideoCall(true)}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Start video call"
                  >
                    <i className="fa fa-video-camera text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Video</span>
                  </button>

                  {/* Always-visible, explicit entry point into group details on every screen size */}
                  <button
                    onClick={() => setShowGroupInfo(true)}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Group details"
                  >
                    <i className="fa fa-info-circle text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Group Info</span>
                  </button>
                </div>
              </header>

              <section className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col">
                {messages.map((msg) => {
                  const isMe = msg.sender._id === currentUserId;

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col group ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <p
                        className={`text-xs mb-1 ${
                          isMe ? "text-green-400 text-right" : "text-blue-400"
                        }`}
                      >
                        {msg.sender.name}
                      </p>

                      <div
                        className={`flex items-center gap-2 max-w-[88%] sm:max-w-[75%] md:max-w-sm lg:max-w-md ${
                          isMe ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-2xl shadow-md break-words ${
                            isMe
                              ? "bg-gradient-to-r from-green-500 to-green-700 text-white"
                              : "bg-gray-800 text-white"
                          }`}
                        >
                          {msg.text}
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleReply(msg)}
                            className="text-gray-400 hover:text-green-400 p-1.5 rounded-full hover:bg-gray-800 transition"
                            aria-label="Reply"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>

                          {isMe && (
                            <button
                              onClick={() => handleDelete(msg._id)}
                              className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-800 transition"
                              aria-label="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-1 1v1H4a1 1 0 000 2h12a1 1 0 100-2h-4V3a1 1 0 00-1-1H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {isMe && (
                        <span className="text-xs text-gray-400 mt-1">
                          {msg.seen ? "Seen " : "Sent "}
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef}></div>
              </section>

              {replyingTo && (
                <div className="px-3 sm:px-4 lg:px-6 py-2 bg-gray-800/80 border-t border-gray-800 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-300 min-w-0 truncate">
                    Replying to{" "}
                    <span className="text-green-400 font-medium">
                      {replyingTo.sender.name}
                    </span>
                    : {replyingTo.text}
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition shrink-0"
                    aria-label="Cancel reply"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <footer className="p-2.5 sm:p-3 lg:p-6 border-t border-gray-800 bg-gray-900/90 backdrop-blur-xl flex items-center space-x-2 sm:space-x-3 lg:space-x-4 shadow-inner">
                <button
                  className="text-gray-400 hover:text-green-400 transition shrink-0"
                  aria-label="Emoji"
                >
                  <i className="fa fa-smile-o text-xl"></i>
                </button>
                <input
                  value={text}
                  type="text"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && text.trim() !== "") sendMessage();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 bg-gray-800 text-gray-200 rounded-xl px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400 shadow-md"
                />

                <button
                  onClick={sendMessage}
                  disabled={!selectedRoom || text.trim() === ""}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-white shrink-0 ${
                    !selectedRoom || text.trim() === ""
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Send
                </button>
              </footer>
            </>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-500 space-y-3">
              <i className="fa fa-comments text-5xl text-gray-700"></i>
              <p>Select a room to start chatting</p>
            </div>
          )}

          {voiceCall && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-6 z-50 px-4">
              <h2 className="text-green-400 text-xl sm:text-2xl font-bold text-center">
                Voice Call with John Doe
              </h2>
              <div className="flex space-x-6 text-2xl text-gray-300">
                <i className="fa fa-microphone hover:text-green-400 cursor-pointer"></i>
                <i className="fa fa-volume-up hover:text-green-400 cursor-pointer"></i>
                <i className="fa fa-user-plus hover:text-green-400 cursor-pointer"></i>
                <i
                  onClick={() => setVoiceCall(false)}
                  className="fa fa-phone-slash text-red-500 hover:text-red-600 cursor-pointer"
                ></i>
              </div>
            </div>
          )}

          {videoCall && (
            <div className="absolute inset-0 bg-black/90 flex flex-col z-50">
              <h2 className="text-green-400 text-center text-lg sm:text-xl font-bold mt-4 px-4">
                Video Call
              </h2>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6">
                <div className="bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 min-h-[140px]">
                  You
                </div>
                <div className="bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 min-h-[140px]">
                  John Doe
                </div>
              </div>
              <div className="flex justify-center space-x-6 p-4 text-2xl text-gray-300">
                <i className="fa fa-microphone hover:text-green-400 cursor-pointer"></i>
                <i className="fa fa-video hover:text-green-400 cursor-pointer"></i>
                <i className="fa fa-user-plus hover:text-green-400 cursor-pointer"></i>
                <i
                  onClick={() => setVideoCall(false)}
                  className="fa fa-phone-slash text-red-500 hover:text-red-600 cursor-pointer"
                ></i>
              </div>
            </div>
          )}
        </main>

        {/* ===================== Group info panel (slide-over on every breakpoint) ===================== */}
        {selectedRoom && (
          <>
            {showGroupInfo && (
              <div
                onClick={() => setShowGroupInfo(false)}
                className="fixed inset-0 bg-black/60 z-40"
              />
            )}

            <aside
              className={`
                fixed top-0 right-0 h-full w-full max-w-xs sm:max-w-sm md:w-80 border-l border-gray-800 p-5 sm:p-6
                bg-gray-900/95 backdrop-blur-xl flex flex-col shadow-xl z-50
                transition-transform duration-300
                ${showGroupInfo ? "translate-x-0" : "translate-x-full"}
              `}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-green-400 tracking-wide uppercase">
                  Group Info
                </h2>
                <button
                  onClick={() => setShowGroupInfo(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition"
                  aria-label="Close group info"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col items-center mb-8">
                <img
                  src={rizwan}
                  alt="Group"
                  className="w-20 h-20 rounded-full ring-2 ring-green-400 shadow-lg mb-3"
                />
                <h3 className="font-semibold text-lg">
                  {selectedRoom.roomName}
                </h3>
                <p className="text-sm text-gray-400">
                  Members ({selectedRoom.members.length})
                </p>
              </div>

              <ul className="space-y-4 flex-1 overflow-y-auto">
                {selectedRoom.members.map((m) => (
                  <li
                    key={m._id}
                    className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-green-500/30 transition"
                  >
                    <span>{m.name}</span>

                    <span
                      className={
                        selectedRoom.createdBy._id === m._id
                          ? "text-green-400 font-semibold"
                          : "text-gray-400"
                      }
                    >
                      {selectedRoom.createdBy._id === m._id
                        ? "Admin"
                        : "Member"}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3">
                {selectedRoom.createdBy?._id === currentUserId && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg shadow-md transition"
                  >
                    Add Member
                  </button>
                )}
                <button
                  onClick={leaveRoom}
                  className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg shadow-md transition"
                >
                  Leave Group
                </button>
              </div>
            </aside>
          </>
        )}

        {showAddMemberModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-5 border-b border-gray-800">
                <h3 className="text-lg font-bold text-green-400 uppercase tracking-wide">
                  Add Member
                </h3>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-gray-800"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto p-4 space-y-3">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No users available to add.
                  </p>
                ) : (
                  availableUsers.map((u) => (
                    <li
                      key={u._id}
                      className="flex items-center justify-between bg-gray-800 p-3 rounded-xl shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-200">
                          {u.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddMember(u)}
                        className="text-xs font-semibold bg-green-600/80 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        Add
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MainChat;