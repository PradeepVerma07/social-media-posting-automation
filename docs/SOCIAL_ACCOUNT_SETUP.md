# Social Account Setup & OAuth Credentials

Guide for connecting LinkedIn, Facebook, Instagram, and X channels to CI360 and n8n.

---

## 1. Preferred Architecture: n8n Credential Manager

To maintain strict security isolation, social network API keys, client secrets, and OAuth tokens are stored inside n8n's encrypted credentials store rather than exposed to web clients:

1. **LinkedIn**:
   - Create an app at `developer.linkedin.com`.
   - Add OAuth 2.0 scopes: `w_member_social`, `r_liteprofile`, `rw_organization_admin`.
   - Store credentials in n8n under `LinkedIn OAuth2 API`.

2. **Facebook & Instagram**:
   - Create a Meta for Developers app.
   - Request permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`.
   - In n8n, create `Facebook Graph API` or `Instagram Graph API` credentials.

3. **X (Twitter)**:
   - Create a developer project at `developer.x.com`.
   - Enable OAuth 2.0 with User Authentication Settings.
   - Scopes: `tweet.read`, `tweet.write`, `users.read`.
   - Store in n8n under `Twitter OAuth2 API`.

---

## 2. Token Expiry Monitoring

CI360 tracks token expiration dates in the `social_accounts` table. When an access token approaches expiration (within 14 days), an alert appears on the Overview Dashboard and a notification is dispatched to Administrators.
