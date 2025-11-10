"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner"; // ✅ Toast import

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved?: boolean;
}

interface Contact {
  _id: string;
  orgName: string;
  email: string;
  registrationFile: string;
}

const AdminDashboard = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [isAuthorized, setIsAuthorized] = useState(false); // ✅ access control state
  const [loading, setLoading] = useState(true);

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("👋 Logged out successfully!");
    setTimeout(() => router.push("/"), 1000);
  };

  const getFileExtension = (url: string) => {
    return url.split(".").pop()?.split("?")[0]?.toLowerCase() || "file";
  };

  // ✅ Access control check before fetching data
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      toast.error("⛔ Unauthorized access. Admins only.");
      router.push("/");
      return;
    }

    setIsAuthorized(true); // ✅ Allow dashboard rendering
  }, [router]);

  // ✅ Fetch users and contacts only if authorized
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        setLoading(true);

        const [usersRes, contactsRes] = await Promise.all([
          axios.get(
            "https://disaster-watch-backend.onrender.com/api/auth/all-users",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          axios.get("https://disaster-watch-backend.onrender.com/api/contact", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setUsers(usersRes.data);
        setContacts(contactsRes.data);
        toast.success("✅ Admin data loaded successfully!");
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to load admin data. Redirecting...");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized, router]);

  // ✅ Add user
  const addUser = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "https://disaster-watch-backend.onrender.com/api/auth/add-user",
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers([...users, res.data.user]);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      toast.success(`🎉 User "${res.data.user.name}" added successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "❌ Failed to add user.");
    }
  };

  // ✅ Remove user
  const removeUser = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `https://disaster-watch-backend.onrender.com/api/auth/remove-user/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(users.filter((u) => u._id !== id));
      toast.success("🗑️ User removed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to remove user.");
    }
  };

  // ✅ Loading State
  if (!isAuthorized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin border-4 border-purple-500 border-t-transparent rounded-full w-10 h-10 mx-auto mb-4"></div>
          <p>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-900 text-gray-200 relative">
      {/* ✅ Header with Logout Button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 cursor-pointer transition text-white font-semibold py-2 px-4 rounded-md"
        >
          Logout
        </button>
      </div>

      {/* Add User Form */}
      <div className="mb-8 p-4 border border-gray-700 rounded-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Add New User</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-800 text-gray-200"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="px-3 py-2 rounded border border-gray-700 bg-gray-800 text-gray-200"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            className="px-3 py-2 rounded border border-gray-700 bg-gray-800 text-gray-200"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="px-3 py-2 cursor-pointer rounded border border-gray-700 bg-gray-800 text-gray-200"
          >
            <option value="user">User</option>
            <option value="organization">Organization</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={addUser}
            className="px-4 py-2 bg-purple-600 cursor-pointer rounded hover:bg-purple-700 text-white transition"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <h2 className="text-xl font-semibold mb-4 text-white">
        All Users & Organizations
      </h2>
      <table className="min-w-full border border-gray-700 text-center">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Role</th>
            <th className="px-4 py-2 border">Action</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 text-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="text-center">
              <td className="px-4 py-2 border">{user.name}</td>
              <td className="px-4 py-2 border">{user.email}</td>
              <td className="px-4 py-2 border">{user.role}</td>
              <td className="px-4 py-2 border flex justify-center gap-2">
                <button
                  onClick={() => removeUser(user._id)}
                  className="px-3 py-1 bg-red-600 cursor-pointer rounded hover:bg-red-700 text-white transition"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Organization Submissions */}
      <h2 className="text-xl font-semibold mb-4 text-white mt-8">
        Organization Submissions
      </h2>
      <table className="min-w-full border border-gray-700 text-center">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="px-4 py-2 border">Organization Name</th>
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Document</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 text-gray-200">
          {contacts.map((contact) => {
            const ext = getFileExtension(contact.registrationFile);
            return (
              <tr key={contact._id}>
                <td className="px-4 py-2 border">{contact.orgName}</td>
                <td className="px-4 py-2 border">{contact.email}</td>
                <td className="px-4 py-2 border">
                  {contact.registrationFile ? (
                    <a
                      href={contact.registrationFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 underline hover:text-purple-300"
                    >
                      View Document ({ext.toUpperCase()})
                    </a>
                  ) : (
                    "No document"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
