export const authenticatedFetch = async (url: RequestInfo, options: RequestInit = {}): Promise<Response> => {
  const idToken = localStorage.getItem("mandoubak_id_token");
  const headers = {
    ...(options.headers as Record<string, string>),
    'Authorization': idToken ? `Bearer ${idToken}` : '',
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("mandoubak_id_token");
    localStorage.removeItem("mandoubak_user");
    // Instead of full reload, just clear session and rely on UI state
    // window.location.reload(); 
    throw new Error("Unauthorized");
  }
  
  return response;
};
