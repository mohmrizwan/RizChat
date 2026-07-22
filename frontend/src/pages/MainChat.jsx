// src/pages/MainChat.jsx
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Loader from "../components/Loader";
import CallLogsList from "../pages/CallLogsList";
import socket, { connectSocket, disconnectSocket } from "../Socket/socket";
import { jwtDecode } from "jwt-decode";
import logo from "../assets/images/Copilot_20260715_194139.png";

const MainChat = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null); // ✅ lets us keep focus on the input so mobile keyboard stays open after sending
  const [voiceCall, setVoiceCall] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showChats, setShowChats] = useState(true);
  const [showCallLogs, setShowCallLogs] = useState(false);
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
  const API_URL = import.meta.env.VITE_API_URL;
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mobileView, setMobileView] = useState("list");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessage, setPrivateMessage] = useState([]);
  const [callLogsForChat, setCallLogsForChat] = useState([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false);
  const typingTimeoutRef = useRef(null);
  const typingStartTimeoutRef = useRef(null);
  const activeTypingRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]); // array of userIds
  const [typingUser, setTypingUser] = useState(null); // userId currently typing in open chat
  const [roomActivity, setRoomActivity] = useState({});
  const [privateChatActivity, setPrivateChatActivity] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const selectedRoomIdRef = useRef(null);
  const selectedConversationIdRef = useRef(null);
  const selectedCallLogsUserIdRef = useRef(null);
  const receivedPrivateMessageIdsRef = useRef(new Set());
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callPartnerRef = useRef(null);
  const callIdRef = useRef(null);
  const recorderRef = useRef(null);
  const incomingCallRef = useRef(null);
  const allUsersRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [conversationUserMap, setConversationUserMap] = useState({});

  // ✅ NEW: loading states for every API call that previously had none
  const [usersLoading, setUsersLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [joinRoomLoading, setJoinRoomLoading] = useState(false);
  const [leaveRoomLoading, setLeaveRoomLoading] = useState(false);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(null); // stores memberId being removed
  const sendingLockRef = useRef(false); // ✅ synchronous guard against double-send (click/Enter races)

  const getMediaUrl = (value) => {
    if (!value) return null;
    return /^https?:\/\//i.test(value) ? value : `${API_URL}/${value}`;
  };

  const getAvatarUrl = (name) =>
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(name || "?") +
    "&background=1f2937&color=fff";

  // Chat info panel for private chats
  const [showChatInfo, setShowChatInfo] = useState(false);

  const availableUsers = allUsers.filter(
    (user) => !selectedRoom?.members?.some((member) => member._id === user._id),
  );

  const otherUsers = allUsers.filter((u) => u._id !== currentUserId);
  const currentUserData = allUsers.find((u) => u._id === currentUserId);

  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
  );

  const filteredRooms = allRooms.filter((room) =>
    room.roomName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
  );

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
    if (msg.mediaType === "audio") return "🎤 Voice message";
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
    console.log("SIDEBAR UPDATE:", {
      roomId,
      unreadDelta,
      message,
    });

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
      setAddMemberLoading(true);
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
    } finally {
      setAddMemberLoading(false);
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
      setRemoveMemberLoading(member._id);
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
    } finally {
      setRemoveMemberLoading(null);
    }
  };

  // ✅ Delete Group (admin only)
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
      setDeleteRoomLoading(true);
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
    } finally {
      setDeleteRoomLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, privateMessage]);

  useEffect(() => {
    const vv = window.visualViewport;

    const setViewportHeight = () => {
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      // keep the latest message pinned to the bottom, above the keyboard
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ block: "end" });
      });
    };

    setViewportHeight();

    if (vv) {
      vv.addEventListener("resize", setViewportHeight);
      vv.addEventListener("scroll", setViewportHeight);
    } else {
      window.addEventListener("resize", setViewportHeight);
    }
    window.addEventListener("orientationchange", setViewportHeight);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", setViewportHeight);
        vv.removeEventListener("scroll", setViewportHeight);
      } else {
        window.removeEventListener("resize", setViewportHeight);
      }
      window.removeEventListener("orientationchange", setViewportHeight);
    };
  }, []);

  const getUsers = async () => {
    try {
      setUsersLoading(true);
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
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken || !currentUserId) return;

    const registerOnlineUser = () =>
      socket.emit("userOnline", currentUserId.toString());
    socket.on("connect", registerOnlineUser);
    connectSocket(storedToken);
    if (socket.connected) registerOnlineUser();

    return () => socket.off("connect", registerOnlineUser);
  }, [currentUserId]);

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
    console.log("🔥 receiveMessage listener active");

    const handleReceiveMessage = (newMessage) => {
      console.log("🔥 PRIVATE MESSAGE RECEIVED:", newMessage);

      const msgRoomId =
        newMessage.room?._id || newMessage.room || newMessage.roomId;
      const isOpenRoom =
        msgRoomId?.toString() === selectedRoomIdRef.current?.toString();

      console.log("Message room:", msgRoomId);
      console.log("Selected room:", selectedRoom?._id);
      console.log("Is open:", isOpenRoom);
      const senderId = newMessage.sender?._id || newMessage.sender;
      const isMyOwnMessage = senderId?.toString() === currentUserId?.toString();

      if (isOpenRoom) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });

        if (!isMyOwnMessage) {
          isSeen(selectedRoom._id);
        }
      }

      if (msgRoomId) {
        updateRoomSidebar(
          msgRoomId,
          newMessage,
          isOpenRoom || isMyOwnMessage ? 0 : 1,
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

  // ✅ Room deleted by admin (broadcast) — kick everyone out of it
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

    socket.emit("joinConversation", selectedConversation._id, () => {
      console.log("Joined conversation:", selectedConversation._id);
    });
  }, [selectedConversation]);

  useEffect(() => {
    const handleIncoming = (message) => {
      const msgConvId = message.conversation?._id || message.conversation;
      if (!msgConvId || !message?._id) return;

      // The server can reach a user through both their conversation room and
      // personal socket. Process that message ID only once.
      if (receivedPrivateMessageIdsRef.current.has(message._id)) return;
      receivedPrivateMessageIdsRef.current.add(message._id);
      if (receivedPrivateMessageIdsRef.current.size > 500) {
        receivedPrivateMessageIdsRef.current.clear();
      }

      const isOpenConversation =
        selectedConversation &&
        msgConvId?.toString() === selectedConversation._id?.toString();

      const senderId = message.sender?._id || message.sender;
      const isMyOwnMessage = senderId?.toString() === currentUserId?.toString();

      if (isOpenConversation) {
        setPrivateMessage((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });

        if (!isMyOwnMessage) {
          markPrivateSeen(selectedConversation._id);
        }
      }

      if (!isMyOwnMessage) {
        const matchedUser = conversationUserMap[msgConvId]?.userId || senderId;
        if (matchedUser) {
          setConversationUserMap((prev) => ({
            ...prev,
            [msgConvId]: {
              userId: matchedUser.toString(),
              userName: message.sender?.name || prev[msgConvId]?.userName,
            },
          }));
          updatePrivateSidebar(
            matchedUser,
            message,
            msgConvId,
            isOpenConversation ? 0 : 1,
          );
        }
      }
    };

    socket.on("receivePrivateMessage", handleIncoming);

    return () => socket.off("receivePrivateMessage", handleIncoming);
  }, [selectedConversation, currentUserId, conversationUserMap]);

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
      setRoomsLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/room/allRooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const rooms = response.data.myRooms || [];
      setallRooms(rooms);

      // ✅ FIX: seed roomActivity right away from the room documents'
      // own lastMessage/lastMessageAt fields (already returned by this API).
      // Without this, a room's sidebar position only becomes correct AFTER
      // you open it — which looked like "clicking a chat jumps it to top".
      setRoomActivity((prev) => {
        const next = { ...prev };
        rooms.forEach((room) => {
          const key = room._id?.toString();
          if (!key) return;
          // don't clobber activity we've already learned from sockets/opening the room
          if (next[key]) return;
          if (!room.lastMessageAt) return;
          next[key] = {
            lastMessage: room.lastMessage || "",
            lastMessageAt: room.lastMessageAt,
            unreadCount: 0,
          };
        });
        return next;
      });
    } catch (error) {
      console.log(error);
    } finally {
      setRoomsLoading(false);
    }
  };

  const getConversations = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/privateChat/allConversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const conversations = response.data.conversations || [];

      // ✅ FIX: seed privateChatActivity + conversationUserMap right away from
      // the bulk conversations endpoint, so private chats sort correctly on
      // page load instead of only after you open each one.
      setPrivateChatActivity((prev) => {
        const next = { ...prev };
        conversations.forEach((conv) => {
          const key = conv.otherUserId?.toString();
          if (!key || next[key]) return;
          if (!conv.lastMessageAt) return;
          next[key] = {
            conversationId: conv.conversationId,
            lastMessage: createMessagePreview(conv.lastMessage),
            lastMessageAt: conv.lastMessageAt,
            unreadCount: conv.unreadCount || 0,
          };
        });
        return next;
      });

      setConversationUserMap((prev) => {
        const next = { ...prev };
        conversations.forEach((conv) => {
          const convKey = conv.conversationId?.toString();
          if (!convKey || next[convKey]) return;
          next[convKey] = { userId: conv.otherUserId };
        });
        return next;
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getRooms();
    getConversations();
  }, []);

  const joinRoom = async () => {
    try {
      setJoinRoomLoading(true);
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
    } finally {
      setJoinRoomLoading(false);
    }
  };

  const leaveRoom = async () => {
    try {
      setLeaveRoomLoading(true);
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
    } finally {
      setLeaveRoomLoading(false);
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
      setDeleteRoomLoading(true);
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
        // ✅ cleanup so UI doesn't keep showing a room that no longer exists
        setSelectedRoom(null);
        setMessages([]);
        setMobileView("list");
        setShowGroupInfo(false);
        getRooms();
      }
    } catch (error) {
      if (error.response?.status === 500) {
        Swal.fire({
          title: "error!",
          icon: "error",
          text: error.response.data.message,
        });
      }
    } finally {
      setDeleteRoomLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedRoom || (text.trim() === "" && !selectedFile)) return;
    try {
      setSendingMessage(true);
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
    } finally {
      setSendingMessage(false);
    }
  };

  const getMessages = async () => {
    const roomId = selectedRoom._id;
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/message/getMessages/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // ✅ if the user switched to a different room while this request
      // was in flight, throw the result away — it's stale
      if (selectedRoomIdRef.current !== roomId) return;

      // ✅ merge instead of overwrite: keep any message that was added
      // locally (e.g. sent while this fetch was still loading) but isn't
      // in the server response yet
      setMessages((prev) => {
        const fetched = response.data;
        const fetchedIds = new Set(fetched.map((m) => m._id));
        const pendingLocal = prev.filter((m) => !fetchedIds.has(m._id));
        return [...fetched, ...pendingLocal];
      });

      if (response.data?.length) {
        const lastMessage = response.data[response.data.length - 1];
        updateRoomSidebar(roomId, lastMessage, 0);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      getMessages();
    } else {
      setMessages([]);
    }
  }, [selectedRoom?._id]);

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

    selectedRoomIdRef.current = room._id;
    selectedConversationIdRef.current = null; // ✅ leaving any open private chat

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
      selectedConversationIdRef.current = conversation._id;
      selectedRoomIdRef.current = null; // ✅ leaving any open room
      setSelectedUser(user);
      setSelectedRoom(null);
      setMobileView("chat");
      setShowGroupInfo(false);
      setShowChatInfo(false);
      setPrivateMessage([]); // clear old conversation's messages immediately
      setCallLogsForChat([]); // clear old conversation's call logs immediately
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
      await getPrivateMessages(conversation._id, user._id);
      getCallLogsForChat(user._id);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.response?.data?.message || "Something went wrong",
      });
    }
  };

  const getCallLogsForChat = async (otherUserId) => {
    if (!otherUserId) return;
    selectedCallLogsUserIdRef.current = otherUserId;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/callLog/betweenUsers/${otherUserId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Discard this response if the user has already switched to a
      // different chat before it arrived — otherwise a slow response for
      // chat A can land after the person opened chat B, leaking A's calls
      // into B's timeline.
      if (selectedCallLogsUserIdRef.current !== otherUserId) return;
      setCallLogsForChat(response.data.calls || []);
    } catch (error) {
      console.error("Unable to load call logs for chat:", error);
    }
  };

  const getPrivateMessages = async (conversationId, forUserId) => {
    try {
      setPrivateMessagesLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/privateChat/getMessages/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // ✅ discard stale response if conversation changed mid-flight
      if (selectedConversationIdRef.current !== conversationId) return;

      const fetched = Array.isArray(response.data)
        ? response.data
        : response.data.messages || [];

      // ✅ merge instead of overwrite
      setPrivateMessage((prev) => {
        const fetchedIds = new Set(fetched.map((m) => m._id));
        const pendingLocal = prev.filter((m) => !fetchedIds.has(m._id));
        return [...fetched, ...pendingLocal];
      });

      // Use the explicitly-passed userId for this conversation rather than
      // the `selectedUser` state, which can still be pointing at the
      // previously-open chat if this resolves before that state commits —
      // otherwise the wrong contact's sidebar preview gets updated.
      const targetUserId = forUserId || selectedUser?._id;
      if (fetched.length && targetUserId) {
        const lastMessage = fetched[fetched.length - 1];
        updatePrivateSidebar(targetUserId, lastMessage, conversationId, 0);
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
      setSendingMessage(true);
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
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);

    const targetId = selectedConversation?._id || selectedRoom?._id;
    if (!targetId || !currentUserId) return;

    const currentUserName = currentUserData?.name || "Someone";

    const typingPayload = {
      chatId: targetId,
      userId: currentUserId,
      userName: currentUserName,
      recipientId: selectedConversation ? selectedUser?._id : undefined,
    };

    clearTimeout(typingTimeoutRef.current);
    clearTimeout(typingStartTimeoutRef.current);

    const stopTyping = () => {
      socket.emit("typing", {
        ...typingPayload,
        isTyping: false,
      });
      activeTypingRef.current = null;
    };

    const scheduleStopTyping = () => {
      typingTimeoutRef.current = setTimeout(stopTyping, 1500);
    };

    if (activeTypingRef.current?.chatId === targetId) {
      scheduleStopTyping();
      return;
    }

    typingStartTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { ...typingPayload, isTyping: true });
      activeTypingRef.current = typingPayload;
      scheduleStopTyping();
    }, 300);
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(typingStartTimeoutRef.current);

      if (activeTypingRef.current) {
        socket.emit("typing", { ...activeTypingRef.current, isTyping: false });
        activeTypingRef.current = null;
      }
    };
  }, [selectedConversation?._id, selectedRoom?._id]);

  const attachCallStream = (stream) => {
    remoteStreamRef.current = stream;
    if (localVideoRef.current)
      localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      void remoteAudioRef.current.play().catch(() => {});
    }
  }, [videoCall, voiceCall]);

  const endCall = (notify = true) => {
    const partnerId = callPartnerRef.current;
    if (notify && partnerId) {
      socket.emit("webrtcEnd", { to: partnerId, callId: callIdRef.current });
    }
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    callPartnerRef.current = null;
    callIdRef.current = null;
    setVoiceCall(false);
    setVideoCall(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIncomingCall(null);

    // Server needs a moment to write the CallLog before we re-fetch it.
    if (partnerId && selectedUser?._id === partnerId) {
      setTimeout(() => getCallLogsForChat(partnerId), 800);
    }
  };

  const createPeer = ({ initiator, stream, partnerId, callType, callId }) => {
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...(turnUrl
          ? [
              {
                urls: turnUrl,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL,
              },
            ]
          : []),
      ],
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peerRef.current = peer;
    callPartnerRef.current = partnerId;
    callIdRef.current = callId;
    const sendSignal = (signal) => {
      socket
        .timeout(5000)
        .emit(
          "webrtcSignal",
          { to: partnerId, signal, callType, callId },
          (error, result) => {
            if (!error && result?.delivered) return;
            if (peerRef.current === peer) {
              endCall(false);
              Swal.fire(
                "Call unavailable",
                result?.message || "The other user could not be reached.",
                "info",
              );
            }
          },
        );
    };
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal({ candidate: candidate.toJSON() });
    };
    peer.ontrack = ({ streams }) => streams[0] && attachCallStream(streams[0]);
    peer.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(peer.connectionState)) {
        if (peerRef.current === peer) endCall(false);
      }
    };
    peer._pendingCandidates = [];
    peer.signal = async (signal) => {
      try {
        if (signal.candidate) {
          if (!peer.remoteDescription) {
            peer._pendingCandidates.push(signal.candidate);
            return;
          }
          await peer.addIceCandidate(signal.candidate);
          return;
        }
        await peer.setRemoteDescription(signal);
        await Promise.all(
          peer._pendingCandidates
            .splice(0)
            .map((candidate) => peer.addIceCandidate(candidate)),
        );
        if (signal.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal(peer.localDescription);
        }
      } catch (error) {
        console.error("WebRTC signalling error:", error);
        if (peerRef.current === peer) endCall(false);
      }
    };
    if (initiator) {
      void (async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          sendSignal(peer.localDescription);
        } catch (error) {
          console.error("WebRTC offer error:", error);
          if (peerRef.current === peer) endCall(false);
        }
      })();
    }
    return peer;
  };

  const getMediaErrorMessage = (error, callType) => {
    if (!window.isSecureContext || !navigator.mediaDevices) {
      return "Calls require HTTPS (or http://localhost). Open the app through localhost or deploy it over HTTPS.";
    }
    if (error?.name === "NotAllowedError") {
      return `Browser access to the ${callType === "video" ? "camera or microphone" : "microphone"} was blocked. Enable it in the site permissions, then try again.`;
    }
    if (error?.name === "NotFoundError") {
      return `No ${callType === "video" ? "camera or microphone" : "microphone"} was found. Connect or enable a device and try again.`;
    }
    if (error?.name === "NotReadableError") {
      return "Your microphone or camera is being used by another application. Close that application and try again.";
    }
    return error?.message || "Unable to access the required media device.";
  };

  const requestCallMedia = (callType) => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return Promise.reject(new Error("Secure context required"));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    groupLocalStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    groupLocalStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
  };

  const startCall = async (callType, targetUser = selectedUser) => {
    if (!targetUser?._id) return;
    if (!socket.connected) {
      Swal.fire(
        "Reconnecting...",
        "Your connection dropped for a moment. Please wait and try again.",
        "info",
      );
      return;
    }
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    try {
      const stream = await requestCallMedia(callType);
      localStreamRef.current = stream;
      const callId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      createPeer({
        initiator: true,
        stream,
        partnerId: targetUser._id,
        callType,
        callId,
      });
      setVoiceCall(callType === "audio");
      setVideoCall(callType === "video");
    } catch (error) {
      console.error("Unable to start call:", error);
      Swal.fire(
        "Unable to start call",
        getMediaErrorMessage(error, callType),
        "error",
      );
    }
  };

  // ✅ NEW: bring the caller's private chat into view so there's context
  // during/after a call, instead of leaving the caller on whatever screen
  // (or list view) they happened to be on when the call came in.
  const openChatWithUser = async (userId) => {
    try {
      const user = allUsersRef.current.find((u) => u._id === userId);
      if (!user) return;
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/privateChat/start`,
        { recieverId: userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const conversation = response.data.conversation;

      setSelectedConversation(conversation);
      selectedConversationIdRef.current = conversation._id;
      selectedRoomIdRef.current = null;
      setSelectedUser(user);
      setSelectedRoom(null);
      setMobileView("chat");
      setShowGroupInfo(false);
      setShowChatInfo(false);
      setCallLogsForChat([]); // clear old conversation's call logs immediately
      setConversationUserMap((prev) => ({
        ...prev,
        [conversation._id]: { userId: user._id, userName: user.name },
      }));

      await joinConversationWithAck(conversation._id);
      await markPrivateSeen(conversation._id);
      await getPrivateMessages(conversation._id, user._id);
      getCallLogsForChat(user._id);
    } catch (error) {
      console.error("Unable to open caller's chat:", error);
    }
  };

  // Used by the Call Logs tab: open the chat for context, then place the call.
  const callFromLog = async (user, callType) => {
    await openChatWithUser(user._id);
    startCall(callType, user);
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await requestCallMedia(incomingCall.callType);
      localStreamRef.current = stream;
      const peer = createPeer({
        initiator: false,
        stream,
        partnerId: incomingCall.from,
        callType: incomingCall.callType,
        callId: incomingCall.callId,
      });
      await peer.signal(incomingCall.signal);
      await Promise.all(
        (incomingCall.pendingCandidates || []).map((candidate) =>
          peer.signal(candidate),
        ),
      );
      setVoiceCall(incomingCall.callType === "audio");
      setVideoCall(incomingCall.callType === "video");
      const callerId = incomingCall.from;
      setIncomingCall(null);

      // ✅ take the user straight into the caller's chat
      void openChatWithUser(callerId);
    } catch (error) {
      endCall(true);
      console.error("Unable to answer call:", error);
      Swal.fire(
        "Unable to answer call",
        getMediaErrorMessage(error, incomingCall.callType),
        "error",
      );
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (event) =>
        event.data.size && chunks.push(event.data);
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : "webm";
        setSelectedFile(
          new File(
            [new Blob(chunks, { type: mimeType })],
            `voice-message.${extension}`,
            { type: mimeType },
          ),
        );
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      Swal.fire(
        "Microphone unavailable",
        "Allow browser microphone access to record a voice message.",
        "error",
      );
    }
  };

  // =====================================================================
  // ✅ GROUP CALLING (audio/video) for rooms
  //
  // This reuses the exact same per-user "webrtcSignal" / "webrtcEnd"
  // socket events your 1:1 calls already use (each event just carries an
  // extra `isGroupCall: true` + `roomId` field). It builds a full mesh:
  // each participant opens a direct RTCPeerConnection to every other
  // participant in the room. To avoid both sides sending an offer at the
  // same time (glare), the participant with the lexicographically lower
  // user id is always the one who initiates that particular connection.
  //
  // IMPORTANT: this assumes your Socket.IO server relays the *entire*
  // payload object it receives for "webrtcSignal"/"webrtcEnd" to the
  // target user's socket (not just a hand-picked subset of fields). If
  // your server explicitly destructures only {to, signal, callType,
  // callId}, add `isGroupCall` and `roomId` to what it forwards too.
  // =====================================================================
  const [groupCallType, setGroupCallType] = useState(null); // "audio" | "video" | null
  const [groupParticipants, setGroupParticipants] = useState({}); // { [userId]: { name, stream } }
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);
  const groupPeersRef = useRef({});
  const groupLocalStreamRef = useRef(null);
  const groupCallIdRef = useRef(null);
  const groupCallRoomIdRef = useRef(null);
  const incomingGroupCallRef = useRef(null);

  useEffect(() => {
    incomingGroupCallRef.current = incomingGroupCall;
  }, [incomingGroupCall]);

  const removeGroupPeer = (peerId) => {
    const peer = groupPeersRef.current[peerId];
    if (peer) {
      peer.close();
      delete groupPeersRef.current[peerId];
    }
    setGroupParticipants((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  };

  const connectToGroupMember = (peerId, stream, callType, callId, name) => {
    if (!peerId || peerId === currentUserId) return null;
    if (groupPeersRef.current[peerId]) return groupPeersRef.current[peerId];

    const initiator = currentUserId?.toString() < peerId?.toString();
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...(turnUrl
          ? [
              {
                urls: turnUrl,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL,
              },
            ]
          : []),
      ],
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    groupPeersRef.current[peerId] = peer;

    const sendSignal = (signal) => {
      socket.emit("webrtcSignal", {
        to: peerId,
        signal,
        callType,
        callId,
        isGroupCall: true,
        roomId: groupCallRoomIdRef.current,
      });
    };

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal({ candidate: candidate.toJSON() });
    };
    peer.ontrack = ({ streams }) => {
      if (!streams[0]) return;
      setGroupParticipants((prev) => ({
        ...prev,
        [peerId]: {
          name: prev[peerId]?.name || name || "Member",
          stream: streams[0],
        },
      }));
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        if (groupPeersRef.current[peerId] === peer) removeGroupPeer(peerId);
      }
    };

    peer._pendingCandidates = [];
    peer.signal = async (signal) => {
      try {
        if (signal.candidate) {
          if (!peer.remoteDescription) {
            peer._pendingCandidates.push(signal.candidate);
            return;
          }
          await peer.addIceCandidate(signal.candidate);
          return;
        }
        await peer.setRemoteDescription(signal);
        await Promise.all(
          peer._pendingCandidates
            .splice(0)
            .map((candidate) => peer.addIceCandidate(candidate)),
        );
        if (signal.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal(peer.localDescription);
        }
      } catch (error) {
        console.error("Group WebRTC signalling error:", error);
        removeGroupPeer(peerId);
      }
    };

    setGroupParticipants((prev) => ({
      ...prev,
      [peerId]: prev[peerId] || { name: name || "Member", stream: null },
    }));

    if (initiator) {
      void (async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          sendSignal(peer.localDescription);
        } catch (error) {
          console.error("Group WebRTC offer error:", error);
          removeGroupPeer(peerId);
        }
      })();
    }

    return peer;
  };

  const endGroupCall = () => {
    Object.keys(groupPeersRef.current).forEach((peerId) => {
      socket.emit("webrtcEnd", {
        to: peerId,
        callId: groupCallIdRef.current,
        isGroupCall: true,
        roomId: groupCallRoomIdRef.current,
      });
      groupPeersRef.current[peerId]?.close();
    });
    groupPeersRef.current = {};
    groupLocalStreamRef.current?.getTracks().forEach((track) => track.stop());
    groupLocalStreamRef.current = null;
    groupCallIdRef.current = null;
    groupCallRoomIdRef.current = null;
    setGroupCallType(null);
    setGroupParticipants({});
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const startGroupCall = async (callType) => {
    if (!selectedRoom) return;
    if (groupCallType) return; // already in a call
    try {
      const stream = await requestCallMedia(callType);
      groupLocalStreamRef.current = stream;
      const callId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      groupCallIdRef.current = callId;
      groupCallRoomIdRef.current = selectedRoom._id;
      setGroupParticipants({});
      setGroupCallType(callType);

      selectedRoom.members
        .filter((member) => member._id !== currentUserId)
        .forEach((member) =>
          connectToGroupMember(
            member._id,
            stream,
            callType,
            callId,
            member.name,
          ),
        );
    } catch (error) {
      console.error("Unable to start group call:", error);
      groupLocalStreamRef.current = null;
      setGroupCallType(null);
      Swal.fire(
        "Unable to start group call",
        getMediaErrorMessage(error, callType),
        "error",
      );
    }
  };

  const acceptGroupCall = async () => {
    if (!incomingGroupCall) return;
    const { from, roomId, callType, callId, signal } = incomingGroupCall;
    try {
      const stream = await requestCallMedia(callType);
      groupLocalStreamRef.current = stream;
      groupCallIdRef.current = callId;
      groupCallRoomIdRef.current = roomId;
      setGroupParticipants({});
      setGroupCallType(callType);
      setIncomingGroupCall(null);

      const callerName = allUsersRef.current.find((u) => u._id === from)?.name;
      const peer = connectToGroupMember(
        from,
        stream,
        callType,
        callId,
        callerName,
      );
      if (peer) await peer.signal(signal);

      // ✅ Join the room's chat view so there's context, and best-effort
      // connect to any other members of the room too (full mesh)
      const room = allRooms.find((r) => r._id === roomId);
      if (room) {
        setSelectedRoom(room);
        selectedRoomIdRef.current = room._id;
        selectedConversationIdRef.current = null;
        setSelectedConversation(null);
        setSelectedUser(null);
        setMobileView("chat");
        setShowGroupInfo(false);
        setShowChatInfo(false);
        room.members
          .filter(
            (member) => member._id !== currentUserId && member._id !== from,
          )
          .forEach((member) =>
            connectToGroupMember(
              member._id,
              stream,
              callType,
              callId,
              member.name,
            ),
          );
      }
    } catch (error) {
      console.error("Unable to join group call:", error);
      groupLocalStreamRef.current = null;
      setGroupCallType(null);
      setIncomingGroupCall(null);
      Swal.fire(
        "Unable to join group call",
        getMediaErrorMessage(error, callType),
        "error",
      );
    }
  };

  const declineGroupCall = () => {
    if (!incomingGroupCall) return;
    socket.emit("webrtcEnd", {
      to: incomingGroupCall.from,
      callId: incomingGroupCall.callId,
      isGroupCall: true,
      roomId: incomingGroupCall.roomId,
    });
    setIncomingGroupCall(null);
  };

  useEffect(() => {
    const handleSignal = ({
      from,
      signal,
      callType,
      callId,
      isGroupCall,
      roomId,
    }) => {
      if (isGroupCall) {
        if (groupPeersRef.current[from]) {
          void groupPeersRef.current[from].signal(signal);
          return;
        }
        if (signal?.type !== "offer") return; // stray candidate with no peer yet

        if (groupCallRoomIdRef.current === roomId) {
          // Already in this room's call — connect straight back (mesh join)
          const name = allUsersRef.current.find((u) => u._id === from)?.name;
          const peer = connectToGroupMember(
            from,
            groupLocalStreamRef.current,
            callType,
            callId,
            name,
          );
          if (peer) void peer.signal(signal);
          return;
        }

        setIncomingGroupCall({ from, roomId, callType, callId, signal });
        return;
      }

      if (peerRef.current && from === callPartnerRef.current) {
        void peerRef.current.signal(signal);
      } else if (!peerRef.current && signal?.type === "offer") {
        if (
          document.hidden &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const caller =
            allUsersRef.current.find((user) => user._id === from)?.name ||
            "A contact";
          const notification = new Notification(`Incoming ${callType} call`, {
            body: `${caller} is calling you on RizChat.`,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        setIncomingCall({
          from,
          signal,
          callType,
          callId,
          pendingCandidates: [],
        });
      } else if (!peerRef.current && signal?.candidate) {
        setIncomingCall((current) =>
          current?.from === from && current.callId === callId
            ? {
                ...current,
                pendingCandidates: [...current.pendingCandidates, signal],
              }
            : current,
        );
      }
    };
    const handleEnd = ({ from, isGroupCall }) => {
      if (isGroupCall) {
        removeGroupPeer(from);
        if (incomingGroupCallRef.current?.from === from)
          setIncomingGroupCall(null);
        return;
      }
      if (
        from === callPartnerRef.current ||
        from === incomingCallRef.current?.from
      )
        endCall(false);
    };
    socket.on("webrtcSignal", handleSignal);
    socket.on("webrtcEnd", handleEnd);
    return () => {
      socket.off("webrtcSignal", handleSignal);
      socket.off("webrtcEnd", handleEnd);
      endCall(false);
      endGroupCall();
    };
  }, []);

  const handleSend = () => {
    if (text.trim() === "" && !selectedFile) return;
    if (sendingLockRef.current) return; // ✅ blocks duplicate click/Enter races instantly (synchronous)

    sendingLockRef.current = true;
    const finish = () => {
      sendingLockRef.current = false;
    };

    try {
      if (selectedConversation) {
        sendPrivateMessage().finally(finish);
      } else if (selectedRoom) {
        sendMessage().finally(finish);
      } else {
        finish();
      }
    } catch (err) {
      console.error("handleSend error:", err);
      finish();
    }

    // ✅ keep the mobile keyboard open after sending — without this, focus
    // drifts to the Send button and the keyboard collapses after every message
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
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

    if (!result.isConfirmed) return;

    try {
      setBlockLoading(true);
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
    } finally {
      setBlockLoading(false);
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
      setBlockLoading(true);
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
    } finally {
      setBlockLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      checkStatus();
    }
  }, [selectedUser, unBlockUser]);

  const renderSeenStatus = (msg) =>
    msg.seen ? (
      <>
        Seen <i className="fa-solid fa-check-double text-blue-400"></i>
      </>
    ) : (
      <>
        Sent <i className="fa-solid fa-check"></i>
      </>
    );

  return (
    <>
      {loading && <Loader text="Logout your account..." />}
      {/* ✅ Root container now actually uses the --app-height variable set by
          the resize/orientation listener above, with 100vh/100dvh fallbacks
          for browsers where the JS hasn't run yet or CSS var is unsupported. */}
      <div
        className="flex w-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-200 font-inter"
        style={{ height: "var(--app-height, 100dvh)" }}
      >
        {/* ===================== Sidebar (rooms list) ===================== */}
        <aside
          className={`
            w-full sm:w-72 md:w-80 lg:w-80 h-full min-h-0 border-r border-gray-800 flex-col bg-gray-900/80 backdrop-blur-xl shrink-0
            ${mobileView === "list" ? "flex" : "hidden"} md:flex
          `}
        >
          <div className="p-4 sm:p-6 border-b border-gray-800 shrink-0">
            <div className="flex justify-between relative" ref={menuRef}>
              <h2 className="text-xl font-bold text-green-400 tracking-wide flex items-center">
                <img src={logo} alt="logo" className="w-10 h-10" /> RizChat
              </h2>

              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="text-white text-lg rounded-full p-2 hover:bg-gray-800 transition cursor-pointer"
              >
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowCreateRoom(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowJoinRoom(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                  >
                    Join Room
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-4 w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-2 outline-none placeholder-gray-500 focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="p-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400 uppercase">View</div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowCallLogs(false);
                    setShowChats(true);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    showChats && !showCallLogs
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                  aria-pressed={showChats && !showCallLogs}
                >
                  Chats
                </button>
                <button
                  onClick={() => {
                    setShowCallLogs(false);
                    setShowChats(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    !showChats && !showCallLogs
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                  aria-pressed={!showChats && !showCallLogs}
                >
                  Groups
                </button>
                <button
                  onClick={() => setShowCallLogs(true)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    showCallLogs
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                  aria-pressed={showCallLogs}
                >
                  Calls
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {showCallLogs ? (
              <>
                <h3 className="text-sm uppercase text-gray-400 mb-2">Calls</h3>
                <CallLogsList
                  apiUrl={API_URL}
                  currentUserId={currentUserId}
                  onOpenChat={(user) => openChatWithUser(user._id)}
                  onStartCall={callFromLog}
                />
              </>
            ) : showChats ? (
              <>
                <h3 className="text-sm uppercase text-gray-400 mb-2">Chats</h3>
                {usersLoading ? (
                  <p className="text-sm text-gray-500">Loading chats...</p>
                ) : sortedUsers.length === 0 ? (
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
                        <div className="relative shrink-0">
                          <img
                            src={
                              user.profilePic
                                ? getMediaUrl(user.profilePic)
                                : getAvatarUrl(user.name)
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
                {roomsLoading ? (
                  <p className="text-sm text-gray-500">Loading groups...</p>
                ) : sortedRooms.length === 0 ? (
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
                          src={getAvatarUrl(room.roomName)}
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
        </aside>

        {/* ===================== Main chat column ===================== */}
        <main
          className={`
            flex-1 flex-col relative min-w-0 min-h-0 overflow-hidden
            ${mobileView === "chat" ? "flex" : "hidden"} md:flex
          `}
        >
          {selectedRoom ? (
            <>
              <header className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-800 bg-gray-900/90 backdrop-blur-xl shadow-lg gap-2 shrink-0">
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
                      src={getAvatarUrl(selectedRoom.roomName)}
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
                    onClick={() => startGroupCall("audio")}
                    disabled={!!groupCallType}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition disabled:opacity-50"
                    aria-label="Start group audio call"
                  >
                    <i className="fa fa-phone text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Audio</span>
                  </button>

                  <button
                    onClick={() => startGroupCall("video")}
                    disabled={!!groupCallType}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition disabled:opacity-50"
                    aria-label="Start group video call"
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

              <section className="flex-1 min-h-0 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col">
                {messagesLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-green-400"></i>
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isMe = msg.sender._id === currentUserId;

                      const currentDate = new Date(
                        msg.createdAt,
                      ).toDateString();
                      const prevDate =
                        index > 0
                          ? new Date(
                              messages[index - 1].createdAt,
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
                            <p
                              className={`text-xs mb-1 ${
                                isMe
                                  ? "text-green-400 text-right"
                                  : "text-blue-400"
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

                                {msg.mediaType === "audio" && msg.media && (
                                  <audio
                                    controls
                                    className="max-w-[250px] mb-2"
                                  >
                                    <source src={getMediaUrl(msg.media)} />
                                  </audio>
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
                              <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                {renderSeenStatus(msg)}
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
                  </>
                )}
              </section>

              {replyingTo && (
                <div className="px-3 sm:px-4 lg:px-6 py-2 bg-gray-800/80 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
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

              <footer className="p-2.5 sm:p-3 lg:p-6 border-t border-gray-800 bg-gray-900/90 backdrop-blur-xl flex items-center space-x-2 sm:space-x-3 lg:space-x-4 shadow-inner shrink-0">
                <button
                  className="text-gray-400 hover:text-green-400 transition shrink-0"
                  aria-label="Emoji"
                >
                  <i className="fa fa-smile-o text-xl"></i>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-green-400 transition shrink-0"
                  aria-label="Attach file"
                >
                  <i className="fa fa-paperclip text-xl"></i>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    isRecording
                      ? recorderRef.current?.stop()
                      : startVoiceRecording()
                  }
                  className={`transition shrink-0 ${isRecording ? "text-red-400 animate-pulse" : "text-gray-400 hover:text-green-400"}`}
                  aria-label={
                    isRecording ? "Stop recording" : "Record voice message"
                  }
                >
                  <i
                    className={`fa fa-${isRecording ? "stop" : "microphone"} text-xl`}
                  ></i>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf"
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
                    ref={textInputRef}
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
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={
                    !selectedRoom ||
                    (text.trim() === "" && !selectedFile) ||
                    sendingMessage
                  }
                  className={`px-3 sm:px-4 py-2 rounded-lg text-white shrink-0 ${
                    !selectedRoom ||
                    (text.trim() === "" && !selectedFile) ||
                    sendingMessage
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
              </footer>
            </>
          ) : selectedConversation ? (
            <>
              <header className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-800 bg-gray-900/90 backdrop-blur-xl shadow-lg gap-2 shrink-0">
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
                    onClick={() => setShowChatInfo(true)}
                    className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 text-left"
                    aria-label="Open chat details"
                  >
                    <img
                      src={
                        selectedUser?.profilePic
                          ? getMediaUrl(selectedUser.profilePic)
                          : getAvatarUrl(selectedUser?.name)
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
                    onClick={() => startCall("audio")}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Start audio call"
                  >
                    <i className="fa fa-phone text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Audio</span>
                  </button>

                  <button
                    onClick={() => startCall("video")}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 sm:px-3 py-2 rounded-lg shadow-md transition"
                    aria-label="Start video call"
                  >
                    <i className="fa fa-video-camera text-green-400"></i>
                    <span className="text-sm hidden lg:inline">Video</span>
                  </button>

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

              <section className="flex-1 min-h-0 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col">
                {privateMessagesLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-green-400"></i>
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                ) : privateMessage.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-gray-500 text-center">
                      No messages yet. Say hi 👋
                    </p>
                  </div>
                ) : (
                  (() => {
                  const chatTimeline = [
                    ...privateMessage.map((m) => ({
                      type: "message",
                      createdAt: m.createdAt,
                      key: `msg-${m._id}`,
                      data: m,
                    })),
                    ...callLogsForChat.map((c) => ({
                      type: "call",
                      createdAt: c.createdAt,
                      key: `call-${c._id}`,
                      data: c,
                    })),
                  ].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                  );

                  return chatTimeline.map((item, index) => {
                    const currentDate = new Date(
                      item.createdAt,
                    ).toDateString();
                    const prevDate =
                      index > 0
                        ? new Date(
                            chatTimeline[index - 1].createdAt,
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

                    if (item.type === "call") {
                      const call = item.data;
                      const isOutgoing = call.caller === currentUserId;
                      const missed = ["missed", "rejected", "cancelled"].includes(
                        call.status,
                      );
                      const callStatusLabel = {
                        ringing: "Not answered",
                        answered: "Answered",
                        missed: "No answer",
                        rejected: "Declined",
                        cancelled: "Missed",
                      }[call.status] || call.status;
                      const durationLabel =
                        call.duration > 0
                          ? ` · ${Math.floor(call.duration / 60)}m ${
                              call.duration % 60
                            }s`
                          : "";

                      return (
                        <React.Fragment key={item.key}>
                          {showDateDivider && (
                            <div className="flex justify-center my-3">
                              <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full shadow-md">
                                {dateLabel}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-center my-1">
                            <div
                              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gray-800/70 ${
                                missed ? "text-red-400" : "text-gray-300"
                              }`}
                            >
                              <i
                                className={`fa fa-${
                                  call.type === "video" ? "video-camera" : "phone"
                                }`}
                              ></i>
                              <span>
                                {isOutgoing ? "Outgoing" : "Incoming"}{" "}
                                {call.type} call · {callStatusLabel}
                                {durationLabel}
                              </span>
                              <span className="text-gray-500">
                                {new Date(call.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    const msg = item.data;
                    const isMe = msg.sender._id === currentUserId;

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

                              {msg.mediaType === "audio" && msg.media && (
                                <audio controls className="max-w-[250px] mb-2">
                                  <source src={getMediaUrl(msg.media)} />
                                </audio>
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
                            <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              {renderSeenStatus(msg)}
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
                  });
                })()
                )}
                <div ref={messagesEndRef}></div>
              </section>

              {replyingTo && (
                <div className="px-3 sm:px-4 lg:px-6 py-2 bg-gray-800/80 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
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
                <div className="bg-red-800 p-3 text-white shrink-0">
                  You blocked this user unblock to chat
                </div>
              ) : blockedMe ? (
                <div className="shrink-0">
                  <p className="bg-red-800 p-3 text-white">
                    This user has blocked you.
                  </p>
                </div>
              ) : (
                <footer className="p-2.5 sm:p-3 lg:p-6 border-t border-gray-800 bg-gray-900/90 backdrop-blur-xl flex items-center space-x-2 sm:space-x-3 lg:space-x-4 shadow-inner shrink-0">
                  <button
                    className="text-gray-400 hover:text-green-400 transition shrink-0"
                    aria-label="Emoji"
                  >
                    <i className="fa fa-smile-o text-xl"></i>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-green-400 transition shrink-0"
                    aria-label="Attach file"
                  >
                    <i className="fa fa-paperclip text-xl"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      isRecording
                        ? recorderRef.current?.stop()
                        : startVoiceRecording()
                    }
                    className={`transition shrink-0 ${isRecording ? "text-red-400 animate-pulse" : "text-gray-400 hover:text-green-400"}`}
                    aria-label={
                      isRecording ? "Stop recording" : "Record voice message"
                    }
                  >
                    <i
                      className={`fa fa-${isRecording ? "stop" : "microphone"} text-xl`}
                    ></i>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf"
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
                      ref={textInputRef}
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
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={
                      (!selectedConversation && !selectedRoom) ||
                      (text.trim() === "" && !selectedFile) ||
                      sendingMessage
                    }
                    className={`px-3 sm:px-4 py-2 rounded-lg text-white shrink-0 ${
                      (!selectedConversation && !selectedRoom) ||
                      (text.trim() === "" && !selectedFile) ||
                      sendingMessage
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </footer>
              )}
            </>
          ) : (
            // ✅ Placeholder now visible on mobile too, not just md+
            <div className="flex flex-1 flex-col items-center justify-center text-gray-500 space-y-3">
              <i className="fa fa-comments text-5xl text-gray-700"></i>
              <p>Select a room to start chatting</p>
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
              <div className="flex items-center justify-between mb-6 shrink-0">
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

              {/* ✅ Avatar now matches the header — dynamic, generated from room name */}
              <div className="flex flex-col items-center mb-8 shrink-0">
                <img
                  src={getAvatarUrl(selectedRoom.roomName)}
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

              <ul className="space-y-4 flex-1 min-h-0 overflow-y-auto">
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
                          disabled={removeMemberLoading === m._id}
                          className="bg-red-800 rounded-full p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                          aria-label={`Remove ${m.name}`}
                        >
                          {removeMemberLoading === m._id ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-user-slash"></i>
                          )}
                        </button>
                      )}
                    {selectedRoom.createdBy._id !== currentUserId &&
                      m._id === currentUserId && (
                        <button
                          onClick={leaveRoom}
                          disabled={leaveRoomLoading}
                          className="bg-red-800 rounded-full p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                          aria-label="Leave room"
                        >
                          {leaveRoomLoading ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-right-from-bracket"></i>
                          )}
                        </button>
                      )}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 shrink-0">
                {selectedRoom.createdBy?._id === currentUserId && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg shadow-md transition"
                  >
                    Add Member
                  </button>
                )}

                {selectedRoom.createdBy?._id === currentUserId ? (
                  <button
                    onClick={deleteRoom}
                    disabled={deleteRoomLoading}
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {deleteRoomLoading ? "Deleting..." : "Delete Group"}
                  </button>
                ) : (
                  <button
                    onClick={leaveRoom}
                    disabled={leaveRoomLoading}
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {leaveRoomLoading ? "Leaving..." : "Leave Group"}
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
              <div className="flex items-center justify-between mb-6 shrink-0">
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

              {/* ✅ Avatar now matches the header — real profile pic or generated fallback */}
              <div className="flex flex-col items-center mb-8 shrink-0">
                <img
                  src={
                    selectedUser.profilePic
                      ? getMediaUrl(selectedUser.profilePic)
                      : getAvatarUrl(selectedUser.name)
                  }
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

              <div className="flex-1 min-h-0" />

              {/* ✅ Fixed invalid `w-70` class — buttons now full width like other panel buttons */}
              <div className="mt-6 space-y-3 shrink-0">
                {isBlocked ? (
                  <button
                    className="w-full bg-green-800 hover:bg-green-700 p-2.5 rounded-xl transition disabled:opacity-50"
                    onClick={unBlockUser}
                    disabled={blockLoading}
                  >
                    {blockLoading ? "Unblocking..." : "Unblock"}
                  </button>
                ) : (
                  <button
                    className="w-full bg-red-800 hover:bg-red-700 p-2.5 rounded-xl transition disabled:opacity-50"
                    onClick={blockUser}
                    disabled={blockLoading}
                  >
                    {blockLoading ? "Blocking..." : "Block"}
                  </button>
                )}
              </div>
            </aside>
          </>
        )}

        {showAddMemberModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
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

              <ul className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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
                        disabled={addMemberLoading}
                        className="text-xs font-semibold bg-green-600/80 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {addMemberLoading ? "Adding..." : "Add"}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="p-4 border-t border-gray-800 shrink-0">
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

        {/* ===================== Call overlays — rendered at the TOP LEVEL =====================
             ✅ FIX: these used to live inside <main>, which is `hidden` on
             mobile whenever mobileView !== "chat" (e.g. while browsing the
             chat list). That made the entire call UI — including the hangup
             button — invisible if a call came in outside the chat screen.
             Now they're siblings of <aside>/<main>, `fixed` to the viewport,
             so they always render regardless of which screen you're on. */}
        {voiceCall && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center space-y-6 z-[55] px-4">
            <h2 className="text-green-400 text-xl sm:text-2xl font-bold text-center">
              Audio call with {selectedUser?.name || "contact"}
            </h2>
            <audio ref={remoteAudioRef} autoPlay />
            <div className="flex space-x-6 text-2xl text-gray-300">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className={isMuted ? "text-red-400" : "hover:text-green-400"}
              >
                <i className={`fa fa-microphone${isMuted ? "-slash" : ""}`}></i>
              </button>
              <i
                onClick={() => endCall()}
                className="fa fa-phone-slash text-red-500 hover:text-red-600 cursor-pointer"
              ></i>
            </div>
          </div>
        )}

   {videoCall && (
  <div className="fixed inset-0 bg-black/90 flex flex-col z-[55]">
    <h2 className="text-green-400 text-center text-lg sm:text-xl font-bold mt-4 px-4 shrink-0">
      Video Call
    </h2>
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 overflow-hidden">
      <div className="bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 h-full min-h-0 overflow-hidden">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-xl" />
      </div>
      <div className="bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 h-full min-h-0 overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-xl" />
      </div>
    </div>
    <div className="flex justify-center space-x-6 p-4 text-2xl text-gray-300 shrink-0">
      <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} className={isMuted ? "text-red-400" : "hover:text-green-400"}>
        <i className={`fa fa-microphone${isMuted ? "-slash" : ""}`}></i>
      </button>
      <button onClick={toggleCamera} aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"} className={isCameraOff ? "text-red-400" : "hover:text-green-400"}>
        <i className={`fa fa-video-camera${isCameraOff ? "-slash" : ""}`}></i>
      </button>
      <i onClick={() => endCall()} className="fa fa-phone-slash text-red-500 hover:text-red-600 cursor-pointer"></i>
    </div>
  </div>
)}
        {incomingCall && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[65] px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center shadow-2xl">
              <h2 className="text-xl font-bold text-green-400">
                Incoming {incomingCall.callType} call
              </h2>
              <p className="text-gray-300 mt-2">
                {allUsers.find((user) => user._id === incomingCall.from)
                  ?.name || "A contact"}{" "}
                is calling.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => endCall(true)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                >
                  Decline
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                >
                  Answer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== Group call overlay ===================== */}
 {groupCallType && (
  <div className="fixed inset-0 bg-black/90 flex flex-col z-[55] px-2 sm:px-4">
    <h2 className="text-green-400 text-center text-lg sm:text-xl font-bold mt-4 shrink-0">
      {selectedRoom?.roomName || "Group"} call
    </h2>
    <div className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 sm:p-6 overflow-y-auto content-start">
      {/* ...unchanged tiles... */}
    </div>
    <div className="flex justify-center space-x-6 p-4 text-2xl text-gray-300 shrink-0">
      {/* ...unchanged controls... */}
    </div>
  </div>
)}
        {/* ===================== Incoming group call prompt ===================== */}
        {incomingGroupCall && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[65] px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center shadow-2xl">
              <h2 className="text-xl font-bold text-green-400">
                Incoming group {incomingGroupCall.callType} call
              </h2>
              <p className="text-gray-300 mt-2">
                {allUsers.find((u) => u._id === incomingGroupCall.from)?.name ||
                  "Someone"}{" "}
                is calling the group.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={declineGroupCall}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                >
                  Decline
                </button>
                <button
                  onClick={acceptGroupCall}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                >
                  Join
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
                disabled={joinRoomLoading}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={joinRoom}
                disabled={joinRoomLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {joinRoomLoading ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ✅ Small helper component for each remote participant tile in a group call.
// Kept outside MainChat so each tile manages its own <video>/<audio> ref
// without re-touching every other tile's DOM node on every render.
// Small helper component for each remote participant tile in a group call.
const GroupCallTile = ({ participant, isVideo }) => {
  const mediaRef = useRef(null);

  useEffect(() => {
    if (mediaRef.current && participant.stream) {
      mediaRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="bg-gray-800 rounded-xl flex items-center justify-center text-gray-300 min-h-[120px] relative">
      {isVideo ? (
        <video
          ref={mediaRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <>
          <audio ref={mediaRef} autoPlay />
          <i className="fa fa-microphone text-3xl"></i>
        </>
      )}
      <span className="absolute bottom-1 left-1 text-xs bg-black/60 px-2 py-0.5 rounded truncate max-w-[90%]">
        {participant.name}
      </span>
    </div>
  );
};
export default MainChat;