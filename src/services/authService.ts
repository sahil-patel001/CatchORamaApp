import axios from "axios";
import api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL + "/api/v1";

export async function login(email: string, password: string) {
  const res = await axios.post(
    `${API_BASE}/auth/login`,
    { email, password },
    { withCredentials: true }
  );
  return res.data;
}

export async function signup(
  name: string,
  email: string,
  password: string,
  role: string = "vendor",
  businessName?: string
) {
  const payload: Record<string, unknown> = { name, email, password, role };
  if (role === "vendor" && businessName) payload.businessName = businessName;
  const res = await axios.post(`${API_BASE}/auth/register`, payload, {
    withCredentials: true,
  });
  return res.data;
}

export async function logout() {
  const res = await api.post(
    `/auth/logout`,
    {},
    { withCredentials: true }
  );
  return res.data;
}

export async function changePassword(
  currentPassword: string | undefined,
  newPassword: string
) {
  const payload: { newPassword: string; currentPassword?: string } = {
    newPassword,
  };

  // Only include currentPassword if it's provided
  if (currentPassword) {
    payload.currentPassword = currentPassword;
  }

  const res = await api.put(`${API_BASE}/auth/change-password`, payload, {
    withCredentials: true,
  });
  return res.data;
}

export async function getPasswordStatus() {
  const res = await api.get(`${API_BASE}/auth/password-status`, {
    withCredentials: true,
  });
  return res.data;
}

export async function getMe() {
  
  
  const res = await axios.get(`${API_BASE}/auth/me`, { 
    withCredentials: true 
  });
  return res.data;
}

export async function getRefresh() {
  const params = {
    refreshToken: localStorage.getItem("refreshToken")
  };

  const res = await axios.post(`${API_BASE}/auth/refresh`, {
    params,
    withCredentials: true 
  });
  return res.data;
}