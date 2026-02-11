
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
 * Robust sync function for individual entries.
 * Uses form-encoding which is more widely compatible with Google Apps Script templates.
 */
export const syncEntryToSheet = async (url: string, sheetName: string, entry: any): Promise<SyncResult> => {
  const timestamp = new Date().toLocaleTimeString();
  const cleanUrl = sanitizeUrl(url);
  
  if (!cleanUrl || !cleanUrl.includes('/exec')) {
    return { success: false, message: "Invalid Script URL", timestamp };
  }

  try {
    const syncUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}sheet=${encodeURIComponent(sheetName)}`;
    
    // We send data as a JSON string within a 'payload' field.
    // This allows the Apps Script to easily parse it regardless of how it's written.
    const body = new URLSearchParams();
    body.append('payload', JSON.stringify({
      ...entry,
      sheet: sheetName,
      sync_timestamp: new Date().toISOString()
    }));

    console.debug(`Syncing to ${sheetName}...`, entry);

    // mode: 'no-cors' is required to handle the 302 redirect to script.googleusercontent.com
    await fetch(syncUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    return { 
      success: true, 
      message: `Sync dispatched to '${sheetName}'.`, 
      timestamp 
    };
  } catch (error: any) {
    console.error(`Sync Dispatch Failed [${sheetName}]:`, error);
    return { success: false, message: `Network error: ${error.message}`, timestamp };
  }
};

export const syncFullTableToSheet = async (url: string, sheetName: string, items: any[]): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];
  const toSync = items.slice(-50);
  for (const item of toSync) {
    const res = await syncEntryToSheet(url, sheetName, item);
    results.push(res);
  }
  return results;
};
