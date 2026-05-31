---
name: Profile photo upload contract
description: How UDecide profile-photo upload flows through api-server to the legacy backend, and why the endpoint is hand-written (not in OpenAPI).
---

# Profile photo upload

Flow: profile.tsx avatar → expo-image-picker → AuthContext.uploadProfilePhoto →
authApi.uploadProfilePhoto (multipart, field **`photo`**) → api-server
`POST /auth/profile/photo` (multer memoryStorage) → legacyWs.uploadProfilePhoto
(multipart, field **`user_profile`**) → legacy `/edit_profile` with AUTHTOKEN.

**Field names matter:** client/api-server use `photo`; the legacy backend expects
the file under `user_profile` (same column it echoes back). A mismatch silently
drops the image.

**Multipart Content-Type:** never set it manually anywhere in the chain — let
fetch/RN FormData set the boundary. RN FormData takes a `{uri,name,type}` object
for the file part.

**OpenAPI exception:** this endpoint is intentionally NOT in `lib/api-spec/openapi.yaml`.
**Why:** Orval/codegen emits `File`/`Blob` types that fail Node typecheck and
produced a duplicate export. The spec has a comment block documenting it; the
client and server handlers are hand-written and reuse the existing AuthResponse
shape. Do not try to re-add a multipart binary body to the spec.

**Image URL resolution:** legacy returns `user_profile` possibly as a relative
path; `resolveProfileImageUrl()` makes it absolute against the legacy ORIGIN
(not the `/WS` base path).
