import axios from "axios";
import api from "./api";

const API_BASE_URL = `/orders`;

export const getOrders = async () => {
  const response = await api.get(API_BASE_URL, {
    withCredentials: true,
  });
  return response.data;
};
