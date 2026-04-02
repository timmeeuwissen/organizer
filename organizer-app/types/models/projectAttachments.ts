/**
 * Project workspace attachments: external URLs, user-uploaded files (Storage + metadata),
 * and links to mail messages (provider ids + optional display snapshots).
 */

export interface ProjectLink {
  id: string
  userId: string
  projectId: string
  url: string
  title?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectFile {
  id: string
  userId: string
  projectId: string
  /** Path within the Storage bucket, e.g. users/{uid}/projects/{projectId}/{fileId} */
  storagePath: string
  name: string
  mimeType: string
  size: number
  createdAt: Date
  updatedAt: Date
}

export interface ProjectMailLink {
  id: string
  userId: string
  projectId: string
  accountId: string
  emailId: string
  subjectSnapshot?: string
  fromSnapshot?: string
  createdAt: Date
  updatedAt: Date
}
