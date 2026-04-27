export interface AuthData {
  token: string | null;
  tokenType: string;
  projectId: number | null;
  userId: number | null;
}

export function getAuthData(): AuthData {
  if (typeof window === "undefined") {
    return { token: null, tokenType: "Bearer", projectId: null, userId: null };
  }

  const token = localStorage.getItem("token");
  const tokenType = localStorage.getItem("tokenType") || "Bearer";
  const userStr = localStorage.getItem("auth_user");
  
  let projectId = null;
  let userId = null;

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      projectId = user.idProject;
      userId = user.idUser;
    } catch (error) {
      console.error("Error parseando auth_user de localStorage", error);
    }
  }

  return { token, tokenType, projectId, userId };
}

export function getCurrentProjectId(): number | null {
  return getAuthData().projectId;
}