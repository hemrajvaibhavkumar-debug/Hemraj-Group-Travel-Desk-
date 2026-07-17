import { google } from "googleapis";
import { Readable } from "stream";
import { env } from "../config/env";

/**
 * Helper to dynamically create an OAuth2 Drive Client using current environment variables.
 */
function getDriveClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive credentials (ID, Secret, or Refresh Token) are missing from the configuration environment.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Searches for or creates a folder hierarchy in Google Drive using the provided client.
 */
async function getOrCreateFolder(driveInstance: any, pathParts: string[], parentId?: string): Promise<string> {
  let currentParentId = parentId || "root";
  
  for (const part of pathParts) {
    const cleanPart = part.trim();
    if (!cleanPart) continue;

    // Search for existing folder with same name under current parent
    const response = await driveInstance.files.list({
      q: `name = '${cleanPart.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${currentParentId}' in parents and trashed = false`,
      fields: "files(id)",
      spaces: "drive"
    });

    const files = response.data.files || [];
    if (files.length > 0 && files[0].id) {
      currentParentId = files[0].id;
    } else {
      // Create new folder
      const folderMetadata = {
        name: cleanPart,
        mimeType: "application/vnd.google-apps.folder",
        parents: [currentParentId]
      };
      
      const folder = await driveInstance.files.create({
        requestBody: folderMetadata,
        fields: "id"
      });

      if (folder.data.id) {
        currentParentId = folder.data.id;
      } else {
        throw new Error(`Failed to create folder: ${cleanPart}`);
      }
    }
  }

  return currentParentId;
}

/**
 * Directly uploads a base64 encoded document to a Google Drive path.
 */
export async function uploadFileDirectly(
  fileName: string,
  fileData: string,
  mimeType: string,
  folderPath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const drive = getDriveClient();

    // 1. Resolve or create folder hierarchy
    const pathParts = folderPath.split("/").filter(p => p.trim() !== "");
    const folderId = await getOrCreateFolder(drive, pathParts);

    // 2. Decode base64 data to buffer
    const base64Clean = fileData.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    // 3. Create document upload request
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    
    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink"
    });

    if (!file.data.id) {
      throw new Error("Failed to receive valid file ID from Google Drive API response.");
    }

    // 4. Set public access permission so link is readable by the travel desk / passengers
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone"
      }
    });

    // Fetch the latest file metadata to obtain public webViewLink
    const fileInfo = await drive.files.get({
      fileId: file.data.id,
      fields: "webViewLink"
    });

    return {
      success: true,
      url: fileInfo.data.webViewLink || file.data.webViewLink || undefined
    };
  } catch (err: any) {
    console.error("Direct Google Drive upload error:", err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
