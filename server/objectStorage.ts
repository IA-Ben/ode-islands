import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Determine GCP authentication method
const isReplitEnvironment = process.env.REPL_ID !== undefined;
const gcpKeyPath = process.env.GCP_CREDENTIALS_PATH || path.join(process.cwd(), 'gcp-credentials.json');
const gcpCredentialsBase64 = process.env.GCP_CREDENTIALS_BASE64;

// Decode base64 credentials if provided (for Vercel deployment)
let gcpCredentials: any = undefined;
if (gcpCredentialsBase64) {
  try {
    const decoded = Buffer.from(gcpCredentialsBase64, 'base64').toString('utf-8');
    gcpCredentials = JSON.parse(decoded);
    console.log('✅ GCP credentials loaded from base64 environment variable');
  } catch (error) {
    console.error('❌ Failed to decode GCP_CREDENTIALS_BASE64:', error);
  }
}

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage(
  isReplitEnvironment
    ? {
        // Replit environment - use sidecar
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      }
    : gcpCredentials
    ? {
        // Vercel environment - use decoded credentials from base64 env var
        credentials: gcpCredentials,
        projectId: "ode-islands",
      }
    : fs.existsSync(gcpKeyPath)
    ? {
        // Local environment - use service account key file
        keyFilename: gcpKeyPath,
        projectId: "ode-islands",
      }
    : {
        // Fallback - use application default credentials
        projectId: "ode-islands",
      }
);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the private object directory for uploads
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "/odeislands-uploads";
    return dir;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity with content constraints.
  async getObjectEntityUploadURL(constraints?: {
    contentType?: string;
    maxSize?: number;
    fileName?: string;
  }): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL and content constraints
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900, // 15 minutes
      constraints,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
  constraints,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
  constraints?: {
    contentType?: string;
    maxSize?: number;
    fileName?: string;
  };
}): Promise<string> {
  const request: any = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };

  // Add content constraints to the request if provided
  // Note: These may or may not be supported by the Replit sidecar
  if (constraints) {
    if (constraints.contentType) {
      request.content_type = constraints.contentType;
    }
    if (constraints.maxSize) {
      request.content_length_range = [0, constraints.maxSize];
    }
  }

  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}