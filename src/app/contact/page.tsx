"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ import router
import TargetCursor from "../ui/TargetCursor";
import DotGrid from "../ui/DotGrid";
import axios from "axios";

const ContactPage = () => {
  const router = useRouter(); // ✅ initialize router

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [website, setWebsite] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [purpose, setPurpose] = useState("");
  const [achievements, setAchievements] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLaptop, setIsLaptop] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRegistrationFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!orgName || !email || !website || !contactPerson) {
      setError("Please fill in all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("orgType", orgType);
    formData.append("website", website);
    formData.append("regNumber", regNumber);
    formData.append("yearEstablished", yearEstablished);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("contactPerson", contactPerson);
    formData.append("address", address);
    formData.append("city", city);
    formData.append("state", state);
    formData.append("country", country);
    formData.append("purpose", purpose);
    formData.append("achievements", achievements);
    formData.append("teamSize", teamSize);
    if (registrationFile) formData.append("registrationFile", registrationFile);

    try {
      await axios.post(
        "https://disaster-watch-backend.onrender.com/api/contact",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit form. Try again.");
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsLaptop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 space-y-6">
        <h2 className="text-white text-2xl text-center">
          Thank you! Your organization details have been submitted.
        </h2>
        <button
          onClick={() => router.back()} // ✅ go back to previous page
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {isLaptop && <TargetCursor spinDuration={2} hideDefaultCursor={true} />}
      <div className="fixed inset-0 -z-10">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#271E37"
          activeColor="#5227FF"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {/* ✅ Back button on top-left corner */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 bg-purple-600 cursor-pointer cursor-target hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition"
      >
        ← Back
      </button>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl backdrop-blur-xs p-8 rounded-2xl shadow-lg space-y-6"
      >
        <h1 className="text-3xl text-white font-semibold mb-4 text-center">
          Organization Contact Form
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="orgName"
              className="block text-gray-300 mb-2 font-medium"
            >
              Organization Name *
            </label>
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="w-full cursor-target px-4 py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="orgType"
              className="block text-gray-300 mb-2 font-medium"
            >
              Organization Type
            </label>
            <select
              id="orgType"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="w-full  cursor-target px-4 py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
            >
              <option value="">Select type</option>
              <option value="NGO">NGO</option>
              <option value="Startup">Startup</option>
              <option value="Private Company">Private Company</option>
              <option value="Government">Government</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="website"
              className="block text-gray-300 mb-2 font-medium"
            >
              Official Website *
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full cursor-target  px-4 py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="regNumber"
              className="block text-gray-300 mb-2 font-medium"
            >
              Registration Number
            </label>
            <input
              id="regNumber"
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Optional"
              className="w-full px-4  cursor-target py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label
              htmlFor="yearEstablished"
              className="block text-gray-300 mb-2 font-medium"
            >
              Year of Establishment
            </label>
            <input
              id="yearEstablished"
              type="number"
              value={yearEstablished}
              onChange={(e) => setYearEstablished(e.target.value)}
              placeholder="Optional"
              className="w-full cursor-target  px-4 py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label
              htmlFor="teamSize"
              className="block text-gray-300 mb-2 font-medium"
            >
              Team Size
            </label>
            <input
              id="teamSize"
              type="number"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              placeholder="Optional"
              className="w-full px-4  cursor-target py-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="email"
              className="block text-gray-300 mb-2 font-medium"
            >
              Official Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organization.com"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-gray-300 mb-2 font-medium"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91-XXXXXXXXXX"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label
              htmlFor="contactPerson"
              className="block text-gray-300 mb-2 font-medium"
            >
              Point of Contact *
            </label>
            <input
              id="contactPerson"
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-gray-300 mb-2 font-medium"
            >
              Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street Address"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-gray-300 mb-2 font-medium"
            >
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 mb-2 font-medium">
              State / Country
            </label>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
            />
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
              className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        {/* Purpose & Achievements */}
        <div>
          <label
            htmlFor="purpose"
            className="block text-gray-300 mb-2 font-medium"
          >
            Purpose / Reason to Join
          </label>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            placeholder="Describe why your organization wants to join"
            className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
          />
        </div>

        <div>
          <label
            htmlFor="achievements"
            className="block text-gray-300 mb-2 font-medium"
          >
            Achievements / Past Projects
          </label>
          <textarea
            id="achievements"
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            rows={3}
            placeholder="Optional"
            className="w-full px-4 py-3 rounded-md bg-gray-800 border border-gray-700 cursor-target  text-white focus:outline-none focus:border-purple-600"
          />
        </div>

        {/* File Upload */}
        <div>
          <label
            htmlFor="registrationFile"
            className="block text-gray-300 mb-2 font-medium"
          >
            Upload Registration / Proof Document
          </label>
          <input
            id="registrationFile"
            type="file"
            accept=".pdf,.jpg,.png"
            onChange={handleFileChange}
            className="font-semibold cursor-target cursor-pointer text-white hover:text-purple-400 cursor-target transition"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-purple-600 cursor-pointer cursor-target  hover:bg-purple-700 text-white font-semibold py-3 rounded-md mt-4"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default ContactPage;
