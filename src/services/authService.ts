import axios from "axios";
import api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL + "/api/v1";

export async function login(email: string, password: string) {
  const res = await axios.post(
    `${API_BASE}/auth/login`,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json'
      }
     }
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
  });
  return res.data;
}

export async function logout() {
  const res = await api.post(
    `/auth/logout`,
    {},
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

  const res = await api.put(`/auth/change-password`, payload, {
  });
  return res.data;
}

export async function getPasswordStatus() {
  const res = await api.get(`/auth/password-status`, {
  });
  return res.data;
}

export async function getMe() {
  const res = await api.get(`/auth/me`);
  return res.data;
}

export async function getRefresh() {
  const params = {
    refreshToken: localStorage.getItem("refreshToken")
  };

  const res = await axios.post(`${API_BASE}/auth/refresh`, {
    params
  });
  return res.data;
}