import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const API_URL = import.meta.env.VITE_API_URL;

const createAxiosInstance = () => {
  const axiosApi = axios.create({
    baseURL: API_URL,
  });

  axiosApi.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );

  return axiosApi;
};

const axiosApi = createAxiosInstance();

export async function get<T = any>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<T> {
  const response: AxiosResponse<T> = await axiosApi.get(url, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });
  return response.data;
}

export async function post<T = any>(
  url: string,
  data: Record<string, any>,
  config: AxiosRequestConfig = {}
): Promise<T> {
  const response: AxiosResponse<T> = await axiosApi.post(url, data, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });
  return response.data;
}

export async function postFormData<T = any>(
  url: string,
  data: FormData
): Promise<T | undefined> {
  try {
    const req = await fetch(url, {
      method: "POST",
      body: data,
    });
    if (req.ok) {
      const res = await req.json();
      if (res.success) {
        return res.data;
      }
    }
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

export async function put<T = any>(
  url: string,
  data: Record<string, any>,
  config: AxiosRequestConfig = {}
): Promise<T> {
  const response: AxiosResponse<T> = await axiosApi.put(url, data, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });
  return response.data;
}

export async function del<T = any>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<T> {
  const response: AxiosResponse<T> = await axiosApi.delete(url, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    },
  });
  return response.data;
}
