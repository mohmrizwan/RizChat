// src/pages/MainChat.jsx
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Loader from "../components/Loader";
import socket, { connectSocket, disconnectSocket } from "../Socket/socket";
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
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mobileView, setMobileView] = useState("list");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessage, setPrivateMessage] = useState([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]); // array of userIds
  const [typingUser, setTypingUser] = useState(null); // userId currently typing in open chat
  const [roomActivity, setRoomActivity] = useState({});
  const [privateChatActivity, setPrivateChatActivity] = useState({});
  const [conversationUserMap, setConversationUserMap] = useState({});

  const getMediaUrl = (value) => {
    if (!value) return null;
    return /^https?:\/\//i.test(value) ? value : `${API_URL}/${value}`;
  };

  // Chat info panel for private chats
  const [showChatInfo, setShowChatInfo] = useState(false);

  const memberIds = new Set(selectedRoom?.members.map((m) => m._id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u._id));
  const otherUsers = allUsers.filter((u) => u._id !== currentUserId);
  const currentUserData = allUsers.find((u) => u._id === currentUserId);

  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const filteredRooms = allRooms.filter((room) =>
    room.roomName.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aTime = privateChatActivity[a._id]?.lastMessageAt || 0;
    const bTime = privateChatActivity[b._id]?.lastMessageAt || 0;
    if (aTime !== bTime) return new Date(bTime) - new Date(aTime);
    return a.name.localeCompare(b.name);
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aTime = roomActivity[a._id]?.lastMessageAt || 0;
    const bTime = roomActivity[b._id]?.lastMessageAt || 0;
    if (aTime !== bTime) return new Date(bTime) - new Date(aTime);
    return a.roomName.localeCompare(b.roomName);
  });

  const createMessagePreview = (msg) => {
    if (!msg) return "No messages yet";
    if (msg.isDeleted) return "This message was deleted";
    if (msg.text?.trim()) return msg.text.trim();
    if (msg.mediaType === "image") return "📷 Image";
    if (msg.mediaType === "video") return "🎥 Video";
    if (msg.mediaType === "file" || msg.mediaType === "pdf") return "📎 File";
    return "New message";
  };

  const formatSidebarTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const markMessagesSeenLocally = (messages, { currentUserId, seenBy }) =>
    messages.map((msg) => {
      if (!msg?._id) return msg;

      const isOwnMessage =
        msg.sender?._id?.toString() === currentUserId?.toString() ||
        msg.sender === currentUserId;
      const shouldMarkSeen =
        (seenBy === currentUserId && !isOwnMessage) ||
        (seenBy !== currentUserId && isOwnMessage);

      if (!shouldMarkSeen || msg.seen) return msg;
      return { ...msg, seen: true };
    });

  const handleReply = (msg) => {
    setReplyingTo(msg);
  };

  const updateRoomSidebar = (roomId, message, unreadDelta = 0) => {
    const key = roomId?.toString?.() || String(roomId || "");
    if (!key) return;

    setRoomActivity((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        lastMessage: createMessagePreview(message),
        lastMessageAt: message?.createdAt || new Date().toISOString(),
        unreadCount: Math.max(0, (prev[key]?.unreadCount || 0) + unreadDelta),
      },
    }));
  };

  const updatePrivateSidebar = (
    userId,
    message,
    conversationId,
    unreadDelta = 0,
  ) => {
    const key = userId?.toString?.() || String(userId || "");
    if (!key) return;

    setPrivateChatActivity((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        conversationId,
        lastMessage: createMessagePreview(message),
        lastMessageAt: message?.createdAt || new Date().toISOString(),
        unreadCount: Math.max(0, (prev[key]?.unreadCount || 0) + unreadDelta),
      },
    }));
  };

  const handleDelete = async (messageId) => {
    try {
      const token = localStorage.getItem("token");

      const endpoint = selectedConversation
        ? `${API_URL}/privateChat/deletePrivateMessage/${messageId}`
        : `${API_URL}/message/deleteMessage/${messageId}`;

      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const markDeleted = (prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeleted: true,
                text: "This message was deleted",
                media: null,
                mediaType: null,
              }
            : msg,
        );

      setMessages(markDeleted);
      setPrivateMessage(markDeleted);
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
        `${API_URL}/room/addMember`,
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
      await getRooms();
      if (selectedRoom) {
        setSelectedRoom((prev) =>
          prev?._id === selectedRoom._id
            ? response.data.updatedRoom || prev
            : prev,
        );
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const removeMember = async (member) => {
    if (!selectedRoom) return;

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Remove Member?",
      html: `Remove <strong>${member.name}</strong> from the group?`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/room/removeMember`,
        {
          roomId: selectedRoom._id,
          userId: member._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Removed",
        text: response.data.message,
      });

      setSelectedRoom(response.data.updatedRoom || selectedRoom);
      getRooms();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  // ✅ New: Delete Group (admin only)
  const deleteGroup = async () => {
    if (!selectedRoom) return;

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Delete Group?",
      text: "This will permanently delete the group for all members. This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.delete(
        `${API_URL}/room/deleteRoom/${selectedRoom._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Group Deleted",
        text: response.data.message || "The group has been deleted",
      });

      setSelectedRoom(null);
      setMessages([]);
      setMobileView("list");
      setShowGroupInfo(false);
      getRooms();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, privateMessage]);

  const getUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/user/allUsers`, {
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
    getUsers();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      connectSocket(storedToken);
    }
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/user/logout`);
      if (response.status === 200) {
        Swal.fire({
          title: "Account Logout",
          text: response.data.message,
          icon: "success",
        });

        disconnectSocket();
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
      if (currentUserId) {
        socket.emit("userOnline", currentUserId);
      }
    });

    return () => {
      socket.off("connect");
    };
  }, [currentUserId]);

  // ✅ Online presence — list of currently online user ids
  useEffect(() => {
    socket.on("onlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });

    return () => socket.off("onlineUsers");
  }, []);

  // ✅ Block/unblock notifications from other users
  useEffect(() => {
    const handleUserBlocked = ({ blockedBy }) => {
      if (selectedUser?._id === blockedBy) {
        setBlockedMe(true);
      }
    };

    const handleUserUnblocked = ({ unblockedBy }) => {
      if (selectedUser?._id === unblockedBy) {
        setBlockedMe(false);
      }
    };

    socket.on("userBlocked", handleUserBlocked);
    socket.on("userUnblocked", handleUserUnblocked);

    return () => {
      socket.off("userBlocked", handleUserBlocked);
      socket.off("userUnblocked", handleUserUnblocked);
    };
  }, [selectedUser]);

  // ✅ Typing indicator listener — works for both room and private chat
  useEffect(() => {
    const activeChatId = selectedConversation?._id || selectedRoom?._id;

    const handleTyping = ({ chatId, userId, userName, isTyping }) => {
      if (userId === currentUserId) return; // ignore own typing echo
      if (!activeChatId || chatId?.toString() !== activeChatId?.toString())
        return; // ✅ ignore typing events from a different (stale) chat
      setTypingUser(isTyping ? { userId, userName } : null);
    };

    const handleStopTyping = ({ chatId, userId }) => {
      if (userId === currentUserId) return;
      if (!activeChatId || chatId?.toString() !== activeChatId?.toString())
        return;
      setTypingUser(null);
    };

    socket.on("userTyping", handleTyping);
    socket.on("userStopTyping", handleStopTyping);

    return () => {
      socket.off("userTyping", handleTyping);
      socket.off("userStopTyping", handleStopTyping);
    };
  }, [currentUserId, selectedConversation?._id, selectedRoom?._id]);

  // ✅ Reset typing indicator whenever the active chat changes
  useEffect(() => {
    setTypingUser(null);
    setReplyingTo(null);
  }, [selectedConversation?._id, selectedRoom?._id]);

  // ✅ Reset info panels whenever the active chat changes
  useEffect(() => {
    setShowChatInfo(false);
    setShowGroupInfo(false);
  }, [selectedConversation?._id, selectedRoom?._id]);

  useEffect(() => {
    if (!selectedRoom) return;

    socket.emit("joinRoom", selectedRoom._id);
  }, [selectedRoom]);

  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === newMessage._id);
        if (exists) return prev;
        return [...prev, newMessage];
      });

      const msgRoomId = newMessage.room?._id || newMessage.room;
      const isOpenRoom =
        selectedRoom && msgRoomId?.toString() === selectedRoom._id?.toString();

      if (isOpenRoom && newMessage.sender?._id !== currentUserId) {
        isSeen(selectedRoom._id);
      }

      if (msgRoomId) {
        updateRoomSidebar(
          msgRoomId,
          newMessage,
          isOpenRoom || newMessage.sender?._id === currentUserId ? 0 : 1,
        );
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [selectedRoom, currentUserId]);

  useEffect(() => {
    const handleMessagesSeen = ({ roomId, seenBy }) => {
      if (!selectedRoom || selectedRoom._id !== roomId) return;

      setMessages((prev) =>
        markMessagesSeenLocally(prev, { currentUserId, seenBy }),
      );
    };

    socket.on("messagesSeen", handleMessagesSeen);
    return () => socket.off("messagesSeen", handleMessagesSeen);
  }, [selectedRoom, currentUserId]);

  useEffect(() => {
    const handlePrivateMessagesSeen = ({ conversationId, seenBy }) => {
      if (!selectedConversation || selectedConversation._id !== conversationId)
        return;

      setPrivateMessage((prev) =>
        markMessagesSeenLocally(prev, { currentUserId, seenBy }),
      );
    };

    socket.on("privateMessagesSeen", handlePrivateMessagesSeen);
    return () => socket.off("privateMessagesSeen", handlePrivateMessagesSeen);
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    const handleDeleted = ({ messageId }) => {
      const markDeleted = (prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeleted: true,
                text: "This message was deleted",
                media: null,
                mediaType: null,
              }
            : msg,
        );

      setMessages(markDeleted);
      setPrivateMessage(markDeleted);
    };

    socket.on("messageDeleted", handleDeleted);
    return () => socket.off("messageDeleted", handleDeleted);
  }, []);

  useEffect(() => {
    socket.on("memberAdded", (updatedRoom) => {
      setSelectedRoom(updatedRoom);
    });

    return () => socket.off("memberAdded");
  }, []);

  useEffect(() => {
    const handleMemberLeft = ({ roomId, userId, updatedRoom, isRemoved }) => {
      const isCurrentUser = userId === currentUserId;

      if (isCurrentUser) {
        setSelectedRoom(null);
        setMessages([]);
        setMobileView("list");
      }

      setallRooms((prev) => {
        if (isCurrentUser || isRemoved) {
          return prev.filter((room) => room._id !== roomId);
        }
        return prev.map((room) =>
          room._id === roomId ? updatedRoom || room : room,
        );
      });

      setSelectedRoom((prev) => {
        if (!prev || prev._id !== roomId) return prev;
        return updatedRoom || prev;
      });
    };

    const handleRemovedFromRoom = ({ roomId }) => {
      setSelectedRoom((prev) => {
        if (prev && prev._id === roomId) {
          setMessages([]);
          setMobileView("list");
          setShowGroupInfo(false);
          return null;
        }
        return prev;
      });

      setallRooms((prev) => prev.filter((room) => room._id !== roomId));

      Swal.fire({
        icon: "info",
        title: "Removed from Group",
        text: "You were removed from the room by the admin.",
      });
    };

    socket.on("memberLeft", handleMemberLeft);
    socket.on("removedFromRoom", handleRemovedFromRoom);

    return () => {
      socket.off("memberLeft", handleMemberLeft);
      socket.off("removedFromRoom", handleRemovedFromRoom);
    };
  }, [currentUserId]);

  // ✅ New: room deleted by admin (broadcast) — kick everyone out of it
  useEffect(() => {
    const handleRoomDeleted = ({ roomId }) => {
      setallRooms((prev) => prev.filter((room) => room._id !== roomId));

      setSelectedRoom((prev) => {
        if (prev && prev._id === roomId) {
          setMessages([]);
          setMobileView("list");
          setShowGroupInfo(false);
          return null;
        }
        return prev;
      });
    };

    socket.on("roomDeleted", handleRoomDeleted);
    return () => socket.off("roomDeleted", handleRoomDeleted);
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    socket.emit("joinConversation", selectedConversation._id);
  }, [selectedConversation]);

  useEffect(() => {
    const handleIncoming = (message) => {
      setPrivateMessage((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      const msgConvId = message.conversation?._id || message.conversation;
      const isOpenConversation =
        selectedConversation &&
        msgConvId?.toString() === selectedConversation._id?.toString();

      if (isOpenConversation && message.sender?._id !== currentUserId) {
        markPrivateSeen(selectedConversation._id);
      }

      if (msgConvId) {
        const matchedUser =
          conversationUserMap[msgConvId]?.userId || message.sender?._id;
        if (matchedUser) {
          updatePrivateSidebar(
            matchedUser,
            message,
            msgConvId,
            isOpenConversation || message.sender?._id === currentUserId ? 0 : 1,
          );
        }
      }
    };

    socket.on("receivePrivateMessage", handleIncoming);

    return () => socket.off("receivePrivateMessage", handleIncoming);
  }, [selectedConversation, currentUserId]);

  const createRoom = async () => {
    try {
      setRoomLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/room/createRoom`,
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

      const response = await axios.get(`${API_URL}/room/allRooms`, {
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
        `${API_URL}/room/joinRoom`,
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
        `${API_URL}/room/leaveRoom`,
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
  const deleteRoom = async () => {
    let result = await Swal.fire({
      title: "Are you sure?",
      text: "You want to delete this room",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete room!",
    });
    if (!result.isConfirmed) return;
    try {
      let token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/room/deleteRoom/${selectedRoom._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Deleted!",
          icon: "success",
          text: response.data.message,
        });
      }
    } catch (error) {
      if (response.status === 500) {
        Swal.fire({
          title: "error!",
          icon: "error",
          text: response.data.message,
        });
      }
    }
  };
  const sendMessage = async () => {
    if (!selectedRoom || (text.trim() === "" && !selectedFile)) return;
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("roomId", selectedRoom._id);
      formData.append("text", text);
      if (replyingTo?._id) {
        formData.append("replyTo", replyingTo._id);
      }

      if (selectedFile) {
        formData.append("media", selectedFile);
      }

      const response = await axios.post(
        `${API_URL}/message/sendMessage`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessages((prev) => {
        const newMsg = response.data.message;
        const exists = prev.some((m) => m._id === newMsg._id);
        if (exists) return prev;
        return [...prev, newMsg];
      });

      updateRoomSidebar(selectedRoom._id, response.data.message, 0);

      setText("");
      setReplyingTo(null);
      setSelectedFile(null);
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
        `${API_URL}/message/getMessages/${selectedRoom._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setMessages(response.data);
      if (response.data?.length) {
        const lastMessage = response.data[response.data.length - 1];
        updateRoomSidebar(selectedRoom._id, lastMessage, 0);
      }
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

  const waitForSocketConnection = () =>
    new Promise((resolve) => {
      if (socket.connected) {
        return resolve();
      }

      const onConnect = () => {
        socket.off("connect", onConnect);
        resolve();
      };

      socket.on("connect", onConnect);

      setTimeout(() => {
        socket.off("connect", onConnect);
        resolve();
      }, 1500);
    });

  const joinRoomWithAck = async (roomId) => {
    await waitForSocketConnection();

    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 500);
      socket.emit("joinRoom", roomId, () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  const joinConversationWithAck = async (conversationId) => {
    await waitForSocketConnection();

    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 500);
      socket.emit("joinConversation", conversationId, () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  const isSeen = async (roomId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/message/seen/${roomId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessages((prev) =>
        markMessagesSeenLocally(prev, {
          currentUserId,
          seenBy: currentUserId,
        }),
      );
      setRoomActivity((prev) => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {}),
          unreadCount: 0,
        },
      }));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    setMobileView("chat");
    setSelectedConversation(null);
    setSelectedUser(null);
    setShowGroupInfo(false);
    setShowChatInfo(false);
    setRoomActivity((prev) => ({
      ...prev,
      [room._id]: {
        ...(prev[room._id] || {}),
        unreadCount: 0,
      },
    }));

    await joinRoomWithAck(room._id);
    await isSeen(room._id);
  };

  const handleBackToList = () => {
    setMobileView("list");
  };
  const openPrivateChat = async (user) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/privateChat/start`,
        {
          recieverId: user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const conversation = response.data.conversation;

      setSelectedConversation(conversation);
      setSelectedUser(user);
      setSelectedRoom(null);
      setMobileView("chat");
      setShowGroupInfo(false);
      setShowChatInfo(false);
      setPrivateMessage([]); // clear old conversation's messages immediately
      setConversationUserMap((prev) => ({
        ...prev,
        [conversation._id]: { userId: user._id, userName: user.name },
      }));
      setPrivateChatActivity((prev) => ({
        ...prev,
        [user._id]: {
          ...(prev[user._id] || {}),
          conversationId: conversation._id,
          unreadCount: 0,
        },
      }));

      await joinConversationWithAck(conversation._id);
      await markPrivateSeen(conversation._id);
      await getPrivateMessages(conversation._id);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const getPrivateMessages = async (conversationId) => {
    try {
      setPrivateMessagesLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/privateChat/getMessages/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Support either { messages: [...] } or a raw array response
      const fetched = Array.isArray(response.data)
        ? response.data
        : response.data.messages || [];

      setPrivateMessage(fetched);
      if (fetched.length && selectedUser?._id) {
        const lastMessage = fetched[fetched.length - 1];
        updatePrivateSidebar(selectedUser._id, lastMessage, conversationId, 0);
      }
    } catch (error) {
      console.log(error);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text:
          error.response?.data?.message ||
          "Could not load conversation history",
      });
    } finally {
      setPrivateMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      getPrivateMessages(selectedConversation._id);
    } else {
      setPrivateMessage([]);
    }
  }, [selectedConversation?._id]);

  const sendPrivateMessage = async () => {
    if (!selectedConversation || (text.trim() === "" && !selectedFile)) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("conversationId", selectedConversation._id);
      formData.append("text", text);
      if (replyingTo?._id) {
        formData.append("replyTo", replyingTo._id);
      }

      if (selectedFile) {
        formData.append("media", selectedFile);
      }

      const response = await axios.post(
        `${API_URL}/privateChat/sendMessage`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPrivateMessage((prev) => {
        const newMsg = response.data.privateMessage;
        const exists = prev.some((m) => m._id === newMsg._id);
        if (exists) return prev;
        return [...prev, newMsg];
      });

      if (selectedUser?._id) {
        updatePrivateSidebar(
          selectedUser._id,
          response.data.privateMessage,
          selectedConversation._id,
          0,
        );
      }

      setText("");
      setReplyingTo(null);
      setSelectedFile(null);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);

    const targetId = selectedConversation?._id || selectedRoom?._id;
    if (!targetId || !currentUserId) return;

    const currentUserName = currentUserData?.name || "Someone"; // ✅ fixed

    socket.emit("typing", {
      chatId: targetId,
      userId: currentUserId,
      userName: currentUserName,
      isTyping: true,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        chatId: targetId,
        userId: currentUserId,
        userName: currentUserName,
        isTyping: false,
      });
    }, 1500);
  };

  const handleSend = () => {
    if (text.trim() === "" && !selectedFile) {
      return;
    }

    if (selectedConversation) {
      sendPrivateMessage();
    } else if (selectedRoom) {
      sendMessage();
    }
  };
  const markPrivateSeen = async (conversationId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/privateChat/seen/${conversationId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPrivateMessage((prev) =>
        markMessagesSeenLocally(prev, {
          currentUserId,
          seenBy: currentUserId,
        }),
      );
      const userId = conversationUserMap[conversationId]?.userId;
      if (userId) {
        setPrivateChatActivity((prev) => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            unreadCount: 0,
          },
        }));
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const blockUser = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You want to block this user",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Block user!",
    });

    // User clicked Cancel
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/block/userBlock`,
        {
          recieverId: selectedUser._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Blocked!",
          text: "User blocked successfully.",
          icon: "success",
        });

        setIsBlocked(response.data.isBlocked);
        setBlockedMe(response.data.blockedMe);
      }
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };
  const checkStatus = async () => {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      `${API_URL}/block/status/${selectedUser._id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    setIsBlocked(response.data.isBlocked);
    setBlockedMe(response.data.blockedMe);
  };

  const unBlockUser = async () => {
    try {
      let token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/block/unblockUser/${selectedUser._id}`,
        {
          receiverId: selectedUser._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Unblocked!",
          text: "User unblocked successfully.",
          icon: "success",
        });
        setIsBlocked(false);
        setBlockedMe(false);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };
  useEffect(() => {
    if (selectedUser) {
      checkStatus();
    }
  }, [selectedUser, unBlockUser]);
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
            <div className="flex justify-between">
              <h2 className="text-xl font-bold text-green-400 tracking-wide flex items-center ">
                RizChat
              </h2>
              <Link
                className=" text-white text-lg rounded-4xl p-2 cursor-pointer"
                to="/profile"
              >
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </Link>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                {sortedUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {searchQuery
                      ? `No users found for "${searchQuery}"`
                      : "No chats yet."}
                  </p>
                ) : (
                  sortedUsers.map((user) => {
                    const chatMeta = privateChatActivity[user._id] || {};
                    const unreadCount = chatMeta.unreadCount || 0;
                    const preview =
                      chatMeta.lastMessage || "Start a conversation";
                    return (
                      <div
                        key={user._id}
                        onClick={() => openPrivateChat(user)}
                        className={`p-3 rounded-xl cursor-pointer transition-transform transform hover:scale-105 shadow-md hover:shadow-green-500/30 flex items-center gap-3 ${
                          selectedUser?._id === user._id
                            ? "bg-gray-700 ring-1 ring-green-500/40"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        {/* Avatar with online dot overlay */}
                        <div className="relative shrink-0">
                          <img
                            src={
                              user.profilePic
                                ? getMediaUrl(user.profilePic)
                                : "https://ui-avatars.com/api/?name=" +
                                  encodeURIComponent(user.name) +
                                  "&background=1f2937&color=fff"
                            }
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover bg-gray-600"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-800 ${
                              onlineUsers.includes(user._id)
                                ? "bg-green-400"
                                : "bg-gray-600"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{user.name}</p>
                            {chatMeta.lastMessageAt && (
                              <span className="text-[10px] text-gray-500 shrink-0">
                                {formatSidebarTime(chatMeta.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {preview}
                          </p>
                        </div>

                        {unreadCount > 0 && (
                          <span className="min-w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-semibold flex items-center justify-center px-1.5 shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <>
                <h3 className="text-sm uppercase text-gray-400 mb-2">Groups</h3>
                {sortedRooms.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No groups yet {searchQuery && `for "${searchQuery}"`}.
                  </p>
                ) : (
                  sortedRooms.map((room) => {
                    const roomMeta = roomActivity[room._id] || {};
                    const unreadCount = roomMeta.unreadCount || 0;
                    const preview = roomMeta.lastMessage || room.roomCode;
                    return (
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
                          src={
                            "https://ui-avatars.com/api/?name=" +
                            encodeURIComponent(room.roomName) +
                            "&background=1f2937&color=fff"
                          }
                          alt={room.roomName}
                          className="w-10 h-10 rounded-full ring-1 ring-gray-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">
                              {room.roomName}
                            </p>
                            {roomMeta.lastMessageAt && (
                              <span className="text-[10px] text-gray-500 shrink-0">
                                {formatSidebarTime(roomMeta.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {preview}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="min-w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-semibold flex items-center justify-center px-1.5 shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
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
                      src={
                        "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(selectedRoom.roomName) +
                        "&background=1f2937&color=fff"
                      }
                      alt="User"
                      className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full ring-2 ring-green-400 shadow-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                        {selectedRoom.roomName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">
                        {typingUser
                          ? `${typingUser.userName} is typing...`
                          : `Room Code: ${selectedRoom.roomCode || "------"}`}
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
                {messages.map((msg, index) => {
                  const isMe = msg.sender._id === currentUserId;

                  const currentDate = new Date(msg.createdAt).toDateString();
                  const prevDate =
                    index > 0
                      ? new Date(messages[index - 1].createdAt).toDateString()
                      : null;
                  const showDateDivider = currentDate !== prevDate;

                  const today = new Date().toDateString();
                  const yesterday = new Date(
                    Date.now() - 86400000,
                  ).toDateString();
                  const dateLabel =
                    currentDate === today
                      ? "Today"
                      : currentDate === yesterday
                        ? "Yesterday"
                        : currentDate;

                  return (
                    <React.Fragment key={msg._id}>
                      {showDateDivider && (
                        <div className="flex justify-center my-3">
                          <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full shadow-md">
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      <div
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
                            {/* Image */}
                            {msg.mediaType === "image" && msg.media && (
                              <img
                                src={getMediaUrl(msg.media)}
                                alt="Chat"
                                onClick={() =>
                                  setPreviewImage(getMediaUrl(msg.media))
                                }
                                className="rounded-lg max-w-[250px] mb-2 cursor-pointer hover:opacity-90 transition"
                              />
                            )}

                            {/* Video */}
                            {msg.mediaType === "video" && msg.media && (
                              <video
                                controls
                                className="rounded-lg max-w-[250px] mb-2"
                              >
                                <source
                                  src={getMediaUrl(msg.media)}
                                  type="video/mp4"
                                />
                              </video>
                            )}

                            {msg.replyTo && (
                              <div className="mb-2 rounded-lg border border-gray-700/70 bg-black/20 px-2.5 py-1.5 text-[11px] text-gray-300">
                                <p className="text-[10px] uppercase tracking-wide text-green-400">
                                  Replying to{" "}
                                  {msg.replyTo.sender?.name || "a message"}
                                </p>
                                <p className="mt-1 truncate">
                                  {msg.replyTo.text ||
                                    (msg.replyTo.media
                                      ? "Media message"
                                      : "Message")}
                                </p>
                              </div>
                            )}

                            {/* Text */}
                            {msg.text && <p>{msg.text}</p>}
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
                            {isMe && (
                              <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                {msg.seen ? (
                                  <>
                                    Seen{" "}
                                    <i className="fa-solid fa-check-double text-blue-400"></i>
                                  </>
                                ) : (
                                  <>
                                    Sent <i className="fa-solid fa-check"></i>
                                  </>
                                )}
                              </span>
                            )}
                          </span>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </React.Fragment>
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

                {/* File attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-green-400 transition shrink-0"
                  aria-label="Attach file"
                >
                  <i className="fa fa-paperclip text-xl"></i>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                    e.target.value = "";
                  }}
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  {selectedFile && (
                    <div className="flex items-center gap-2 mb-1 bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg w-fit max-w-full">
                      <i className="fa fa-file-o shrink-0"></i>
                      <span className="truncate">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-500 hover:text-red-400 transition shrink-0"
                        aria-label="Remove file"
                      >
                        <i className="fa fa-times"></i>
                      </button>
                    </div>
                  )}
                  <input
                    value={text}
                    type="text"
                    onChange={handleTextChange}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (text.trim() !== "" || selectedFile)
                      )
                        handleSend();
                    }}
                    placeholder="Type a message..."
                    className="w-full min-w-0 bg-gray-800 text-gray-200 rounded-xl px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400 shadow-md"
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={
                    !selectedRoom || (text.trim() === "" && !selectedFile)
                  }
                  className={`px-3 sm:px-4 py-2 rounded-lg text-white shrink-0 ${
                    !selectedRoom || (text.trim() === "" && !selectedFile)
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Send
                </button>
              </footer>
            </>
          ) : selectedConversation ? (
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

                  {/* ✅ Now clickable — opens Chat Info panel */}
                  <button
                    onClick={() => setShowChatInfo(true)}
                    className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 text-left"
                    aria-label="Open chat details"
                  >
                    <img
                      src={
                        selectedUser?.profilePic
                          ? getMediaUrl(selectedUser.profilePic)
                          : "https://ui-avatars.com/api/?name=" +
                            selectedUser?.name
                      }
                      alt="User"
                      className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full ring-2 ring-green-400 shadow-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                        {selectedUser?.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">
                        {typingUser
                          ? `${typingUser.userName} is typing...`
                          : onlineUsers.includes(selectedUser?._id)
                            ? "Online"
                            : "Offline"}
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

                  {/* ✅ New: Chat Info trigger button */}
                  <button
                    onClick={() => setShowChatInfo(true)}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Chat details"
                  >
                    <i className="fa fa-info-circle text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Chat Info</span>
                  </button>
                </div>
              </header>

              <section className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col">
                {privateMessagesLoading ? (
                  <p className="text-sm text-gray-500 text-center">
                    Loading messages...
                  </p>
                ) : privateMessage.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    No messages yet. Say hi 👋
                  </p>
                ) : (
                  privateMessage.map((msg, index) => {
                    const isMe = msg.sender._id === currentUserId;

                    // ✅ Date divider logic — same toDateString() comparison
                    const currentDate = new Date(msg.createdAt).toDateString();
                    const prevDate =
                      index > 0
                        ? new Date(
                            privateMessage[index - 1].createdAt,
                          ).toDateString()
                        : null;
                    const showDateDivider = currentDate !== prevDate;

                    const today = new Date().toDateString();
                    const yesterday = new Date(
                      Date.now() - 86400000,
                    ).toDateString();
                    const dateLabel =
                      currentDate === today
                        ? "Today"
                        : currentDate === yesterday
                          ? "Yesterday"
                          : currentDate;

                    return (
                      <React.Fragment key={msg._id}>
                        {showDateDivider && (
                          <div className="flex justify-center my-3">
                            <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full shadow-md">
                              {dateLabel}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex flex-col group ${
                            isMe ? "items-end" : "items-start"
                          }`}
                        >
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
                              {/* Image */}
                              {msg.mediaType === "image" && msg.media && (
                                <img
                                  src={getMediaUrl(msg.media)}
                                  alt="Chat"
                                  onClick={() =>
                                    setPreviewImage(getMediaUrl(msg.media))
                                  }
                                  className="rounded-lg max-w-[250px] mb-2 cursor-pointer hover:opacity-90 transition"
                                />
                              )}

                              {/* Video */}
                              {msg.mediaType === "video" && msg.media && (
                                <video
                                  controls
                                  className="rounded-lg max-w-[250px] mb-2"
                                >
                                  <source
                                    src={getMediaUrl(msg.media)}
                                    type="video/mp4"
                                  />
                                </video>
                              )}

                              {msg.replyTo && (
                                <div className="mb-2 rounded-lg border border-gray-700/70 bg-black/20 px-2.5 py-1.5 text-[11px] text-gray-300">
                                  <p className="text-[10px] uppercase tracking-wide text-green-400">
                                    Replying to{" "}
                                    {msg.replyTo.sender?.name || "a message"}
                                  </p>
                                  <p className="mt-1 truncate">
                                    {msg.replyTo.text ||
                                      (msg.replyTo.media
                                        ? "Media message"
                                        : "Message")}
                                  </p>
                                </div>
                              )}

                              {/* Text */}
                              {msg.text && <p>{msg.text}</p>}
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
                              {isMe && (
                                <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  {msg.seen ? (
                                    <>
                                      Seen{" "}
                                      <i className="fa-solid fa-check-double text-blue-400"></i>
                                    </>
                                  ) : (
                                    <>
                                      Sent <i className="fa-solid fa-check"></i>
                                    </>
                                  )}
                                </span>
                              )}
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
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
              {isBlocked ? (
                <div className="bg-red-800 p-3 text-white">
                  You blocked this user unblock to chat
                </div>
              ) : blockedMe ? (
                <div>
                  <p className="bg-red-800 p-3 text-white">
                    This user has blocked you.
                  </p>
                </div>
              ) : (
                <footer className="p-2.5 sm:p-3 lg:p-6 border-t border-gray-800 bg-gray-900/90 backdrop-blur-xl flex items-center space-x-2 sm:space-x-3 lg:space-x-4 shadow-inner">
                  <button
                    className="text-gray-400 hover:text-green-400 transition shrink-0"
                    aria-label="Emoji"
                  >
                    <i className="fa fa-smile-o text-xl"></i>
                  </button>

                  {/* File attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-green-400 transition shrink-0"
                    aria-label="Attach file"
                  >
                    <i className="fa fa-paperclip text-xl"></i>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        setSelectedFile(file);
                      }

                      e.target.value = "";
                    }}
                  />

                  <div className="flex-1 min-w-0 flex flex-col">
                    {selectedFile && (
                      <div className="flex items-center gap-2 mb-1 bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg w-fit max-w-full">
                        <i className="fa fa-file-o shrink-0"></i>
                        <span className="truncate">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-gray-500 hover:text-red-400 transition shrink-0"
                          aria-label="Remove file"
                        >
                          <i className="fa fa-times"></i>
                        </button>
                      </div>
                    )}
                    <input
                      value={text}
                      type="text"
                      onChange={handleTextChange}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          (text.trim() !== "" || selectedFile)
                        )
                          handleSend();
                      }}
                      placeholder={"Type a message..."}
                      className="w-full min-w-0 bg-gray-800 text-gray-200 rounded-xl px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={
                      (!selectedConversation && !selectedRoom) ||
                      (text.trim() === "" && !selectedFile)
                    }
                    className={`px-3 sm:px-4 py-2 rounded-lg text-white shrink-0 ${
                      (!selectedConversation && !selectedRoom) ||
                      (text.trim() === "" && !selectedFile)
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    Send
                  </button>
                </footer>
              )}
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
                Voice Call
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
                  Other user
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

        {/* ===================== Image preview lightbox ===================== */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center px-4 cursor-zoom-out"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-800/60 transition z-[101]"
              aria-label="Close image preview"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
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

            <img
              src={previewImage}
              alt="Full size preview"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}

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
                    {selectedRoom.createdBy._id === currentUserId &&
                      selectedRoom.createdBy._id !== m._id && (
                        <button
                          onClick={() => removeMember(m)}
                          className="bg-red-800 rounded-full p-2 text-white transition hover:bg-red-700"
                          aria-label={`Remove ${m.name}`}
                        >
                          <i className="fa-solid fa-user-slash"></i>
                        </button>
                      )}
                    {selectedRoom.createdBy._id !== currentUserId &&
                      m._id === currentUserId && (
                        <button
                          onClick={leaveRoom}
                          className="bg-red-800 rounded-full p-2 text-white transition hover:bg-red-700"
                          aria-label="Leave room"
                        >
                          <i className="fa-solid fa-right-from-bracket"></i>
                        </button>
                      )}
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

                {/* ✅ Admin sees Delete Group, everyone else sees Leave Group */}
                {selectedRoom.createdBy?._id === currentUserId ? (
                  <button
                    onClick={deleteRoom}
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg shadow-md transition"
                  >
                    Delete Group
                  </button>
                ) : (
                  <button
                    onClick={leaveRoom}
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg shadow-md transition"
                  >
                    Leave Group
                  </button>
                )}
              </div>
            </aside>
          </>
        )}

        {/* ===================== Chat info panel (private chat, slide-over) ===================== */}
        {selectedConversation && selectedUser && (
          <>
            {showChatInfo && (
              <div
                onClick={() => setShowChatInfo(false)}
                className="fixed inset-0 bg-black/60 z-40"
              />
            )}

            <aside
              className={`
                fixed top-0 right-0 h-full w-full max-w-xs sm:max-w-sm md:w-80 border-l border-gray-800 p-5 sm:p-6
                bg-gray-900/95 backdrop-blur-xl flex flex-col shadow-xl z-50
                transition-transform duration-300
                ${showChatInfo ? "translate-x-0" : "translate-x-full"}
              `}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-green-400 tracking-wide uppercase">
                  Chat Info
                </h2>
                <button
                  onClick={() => setShowChatInfo(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition"
                  aria-label="Close chat info"
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
                  alt={selectedUser.name}
                  className="w-20 h-20 rounded-full ring-2 ring-green-400 shadow-lg mb-3"
                />
                <h3 className="font-semibold text-lg">{selectedUser.name}</h3>
                <p
                  className={`text-sm mt-1 ${
                    onlineUsers.includes(selectedUser._id)
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {onlineUsers.includes(selectedUser._id)
                    ? "Online"
                    : "Offline"}
                </p>
                {selectedUser.email && (
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-full">
                    {selectedUser.email}
                  </p>
                )}
              </div>

              <div className="flex-1" />

              <div className="mt-6 space-y-3">
                {isBlocked ? (
                  <button
                    className="bg-green-800 p-2  rounded-xl w-70"
                    onClick={unBlockUser}
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    className="bg-red-800 p-2  rounded-xl w-70"
                    onClick={blockUser}
                  >
                    Block{" "}
                  </button>
                )}
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

      {/* ===================== Create Room modal ===================== */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-green-400">Create Room</h3>
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

      {/* ===================== Join Room modal ===================== */}
      {showJoinRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] px-4">
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
    </>
  );
};

export default MainChat;
