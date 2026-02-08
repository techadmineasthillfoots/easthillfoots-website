
export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
}

const sanitizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return '';
  let sanitized = url.trim();
  if (sanitized.endsWith('/')) sanitized = sanitized.slice(0, -1);
  return sanitized;
};

/**
 * Verifies if the script is reachable and responding correctly
 */
export const testConnection = async (url: string): Promise<SyncResult> => {
  const timestamp = new Date().toLocaleTimeString();
  const cleanUrl = sanitizeUrl(url);
  
  if (!cleanUrl || !cleanUrl.includes('/exec')) {
    return { success: false, message: "URL must end in /exec", timestamp };
  }

  try {
    // Simple fetch without headers to avoid CORS preflight on GET
    const response = await fetch(`${cleanUrl}?sheet=health_check`);

    if (response.ok) {
      return { success: true, message: "Connection Verified! Script is active.", timestamp };
    }
    return { success: false, message: `Server error: ${response.status}`, timestamp };
  } catch (error: any) {
    return { success: false, message: "Network error. Check script deployment and access (Anyone).", timestamp };
  }
};

/**
 * Generic fetch function optimized for GAS redirects and CORS
 */
export const fetchSheetData = async (url: string, sheetName: string): Promise<any[]> => {
  const cleanUrl = sanitizeUrl(url);
  if (!cleanUrl || !cleanUrl.includes('/exec')) return [];
  
  try {
    const fetchUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
    
    // No headers = "simple request" = usually no CORS preflight issues with GAS
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      console.warn(`Fetch failed for ${sheetName}: Status ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (data && data.error) {
      console.error(`Script error for ${sheetName}:`, data.error);
      return [];
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error(`Fetch Error [${sheetName}]:`, error.message);
    return [];
  }
};

/**
 * Sync function for individual entries using no-cors POST
 */
export const syncEntryToSheet = async (url: string, sheetName: string, entry: any): Promise<SyncResult> => {
  const timestamp = new Date().toLocaleTimeString();
  const cleanUrl = sanitizeUrl(url);
  
  if (!cleanUrl || !cleanUrl.includes('/exec')) {
    return { success: false, message: "Invalid Script URL", timestamp };
  }

  try {
    // We send sheet name as both a parameter and in the body for maximum compatibility
    const syncUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
    
    const body = {
      ...entry,
      sheet: sheetName,
      sentAt: new Date().toISOString()
    };

    // We use mode: 'no-cors' to allow cross-origin POST to Google Scripts.
    // This makes the response "opaque" (cannot read success/fail from JS),
    // but the data is sent successfully to the script.
    await fetch(syncUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });

    return { 
      success: true, 
      message: `Sync command sent to ${sheetName}.`, 
      timestamp 
    };
  } catch (error: any) {
    console.error(`Sync Error [${sheetName}]:`, error);
    return { success: false, message: error.message, timestamp };
  }
};

export const syncFullTableToSheet = async (url: string, sheetName: string, items: any[]): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];
  // For safety, limit to last 50 items if pushing bulk
  const toSync = items.slice(-50);
  for (const item of toSync) {
    const res = await syncEntryToSheet(url, sheetName, item);
    results.push(res);
  }
  return results;
};

// Legacy support
export const syncSubscriberToGoogleSheets = (url: string, sub: any) => syncEntryToSheet(url, 'subscriber', sub);
