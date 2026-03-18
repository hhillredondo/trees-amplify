// ─── Member (Neptune _Member vertex) ─────────────────────────────────────────

export type Gender = 'male' | 'female'

/** ISO 8601 datetime string: YYYY-MM-DDTHH:MM:SSZ */
export type ISODateString = string

export interface Member {
  id: string
  label?: string
  name: string
  surname: string
  gender: Gender
  description: string
  born: ISODateString
  died?: ISODateString | null
  pic: string
  photos: string
  profession?: string | null
  birth_location?: string | null
  death_location?: string | null
  height?: number | null
  documents?: string | null
  _partitionKey?: string
}

/** Fields required when creating a new member (standalone / first in tree). */
export interface CreateMemberInput {
  name: string
  surname: string
  gender: Gender
  description: string
  born: ISODateString
  died?: ISODateString | null
  pic: string
  photos: string
  profession?: string | null
  birth_location?: string | null
  death_location?: string | null
  height?: number | null
}

/** Fields that can be updated on an existing member. born & died are immutable. */
export interface UpdateMemberInput {
  id: string
  name?: string
  surname?: string
  description?: string
  pic?: string
  photos?: string
  profession?: string | null
  birth_location?: string | null
  death_location?: string | null
  height?: number | null
}

// ─── Relationships ───────────────────────────────────────────────────────────

export interface SpouseInfo extends Member {
  married: ISODateString
  divorced: ISODateString | null
}

export interface DirectRelations {
  member: Member
  parents: Member[]
  children: Member[]
  spouses: SpouseInfo[]
}

// ─── Tree ────────────────────────────────────────────────────────────────────

export type Role = 'owner' | 'editor' | 'viewer'

/** Tree as returned by GET /trees */
export interface TreeSummary {
  tree_id: string
  role: Role
  partition_key: string | null
  member_count: number
  name?: string | null
}

export interface ListTreesResponse {
  trees: TreeSummary[]
  count: number
}

/** Body for POST /trees — member fields + tree_id */
export interface CreateTreeInput extends CreateMemberInput {
  tree_id: string
}

export interface CreateTreeResponse {
  message: string
  tree_id: string
  partition_key: string
  member: Member
}

// ─── Roles / ACL ─────────────────────────────────────────────────────────────

export interface RoleEntry {
  treeId: string
  userId: string
  role: Role
  createdAt: string
  email?: string | null
}

export interface ListRolesResponse {
  tree_id: string
  roles: RoleEntry[]
  count: number
}

export interface AddRoleInput {
  email: string
  role: 'editor' | 'viewer'
}

export interface AddRoleResponse {
  message: string
  tree_id: string
  user_id: string
  role: string
}

export interface RemoveRoleInput {
  email?: string
  user_id?: string
}

export interface RemoveRoleResponse {
  message: string
  tree_id: string
  user_id: string
  previous_role: string
}

// ─── Editor Lock ─────────────────────────────────────────────────────────────

export interface EditorLock {
  treeId: string
  lockOwner: string
  acquiredAt: string
  expiresAt: number
}

export interface LockStatusResponse {
  tree_id: string
  locked: boolean
  lock: EditorLock | null
}

export interface AcquireLockResponse {
  message: string
  lock: EditorLock
}

export interface ReleaseLockResponse {
  message: string
}

// ─── Create Child / Parent / Spouse ──────────────────────────────────────────

export interface CreateChildInput extends CreateMemberInput {
  parent_id: string
}

export interface CreateParentInput extends CreateMemberInput {
  child_id: string
}

export interface CreateSpouseInput extends CreateMemberInput {
  spouse_id: string
  married: ISODateString
  divorced: ISODateString | null
}

export interface UpdateSpouseRelationInput {
  husband_id: string
  wife_id: string
  married: ISODateString
  divorced: ISODateString | null
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface PicUploadResponse {
  pic: string
  pic_url: string
}

export interface PhotosUploadResponse {
  photos: string
  urls: string[]
  keys: string[]
}

export interface PicUrlResponse {
  pic: string
  url: string
}

export interface PhotosUrlsResponse {
  photos: string
  urls: string[]
  keys: string[]
  expires_in: number
}

export interface DocumentsUploadResponse {
  documents: string
  uploaded: string[]
  uploaded_keys: string[]
}

export interface DocumentsUrlsResponse {
  documents: string
  urls: string[]
  keys: string[]
  expires_in: number
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  user_id: string
  email: string
  username: string
  email_verified: boolean
  token_use: string
  auth_time: number
  exp: number
  iat: number
}

export interface AuthMeResponse {
  user: UserInfo
  message: string
}

