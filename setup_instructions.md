# RCCG House of Glory, YP2 - TEAM GLORY CENTRAL API
## Plain PHP 8+ REST API with SQLite Persistence Engine Installation & Configuration

## 📂 Proposed Folder Directory Structure
```text
/your-root-hosting-folder
├── api.php                  <--- Core REST API endpoint logic & routers
├── schema.sql               <--- Database Table configuration blueprint reference
├── .htaccess                <--- Apache dynamic URL rewrite router fallback configuration
└── storage/
    └── database.sqlite      <--- Automatically created Local SQLite DB file (secured)
```

---

## 🛠️ Setup & Deployment Directions

### Step 1: Upload Files
Upload `api.php`, `.htaccess`, and `schema.sql` to your hosting webroot directory (e.g., `public_html/api` or `/var/www/html/api`).

### Step 2: Configure Folder Permissions
The PHP script needs to write to the `storage/` directory to create and update the SQLite file.
- Make sure that the web server user (`www-data` or the PHP hosting process) has **write/writeable permissions** on the root directory where `api.php` lives.
- On standard shared hosts (like cPanel, Namecheap, Bluehost, HostGator), directory folders are writeable by default. If not, set folder permissions for `storage/` to `755` or `777`.

### Step 3: Verify Apache Mod_Rewrite
If Apache's `mod_rewrite` is enabled on your host, you can send REST calls to clean URLs:
`https://yourdomain.com/api/records/members`

If `mod_rewrite` is not supported on your host, simply include the query route parameter fallback structure:
`https://yourdomain.com/api.php?route=records/members`

---

## 🌐 Dynamic Role & Departmental Rows Restriction
This API enforces structural department level row-isolation (HOD context). Send security scope information using custom request headers:
- `X-Admin-Role`: Set to `'HOD'` or `'Admin'` (if `'SuperAdmin'`, full bypass is allowed).
- `X-Admin-Department`: Set to your ministry unit focus (e.g. `'Multimedia Unit'`). The database will automatically filter returned records corresponding to first or second active choice placements.

---

## 🚀 REST API Call & Request Payloads Examples

### 1. GET Service Health Check
*   **Method**: `GET`
*   **Path**: `/health` or `/api.php?route=health`
*   **Response Payload (`200 OK`)**:
    ```json
    {
      "status": "healthy",
      "service": "RCCG-GloryNet-PHP-API",
      "timestamp": "2026-06-17 10:56:00"
    }
    ```

### 2. POST Register / Save Admin Account
*   **Method**: `POST`
*   **Path**: `/admins_accounts`
*   **Headers**: `Content-Type: application/json`
*   **Request Payload**:
    ```json
    {
      "fullName": "Pastor David",
      "email": "pastordavid@teamglory.com",
      "password": "SecurePassword123",
      "role": "Admin",
      "department": "Prayer Unit"
    }
    ```
*   **Response Payload (`200 OK`)**:
    ```json
    {
      "success": true,
      "message": "Admin user registered."
    }
    ```

### 3. POST Authenticate Admin / Login
*   **Method**: `POST`
*   **Path**: `/admins_accounts/login`
*   **Request Payload**:
    ```json
    {
      "email": "pastordavid@teamglory.com",
      "password": "SecurePassword123"
    }
    ```
*   **Response Payload (`200 OK`)**:
    ```json
    {
      "success": true,
      "user": {
        "id": "ADM419075727",
        "fullName": "Pastor David",
        "email": "pastordavid@teamglory.com",
        "role": "Admin",
        "department": "Prayer Unit",
        "isFirstLogin": 1,
        "requiresPasswordReset": 0,
        "createdAt": "2026-06-17T10:56:00.000Z"
      }
    }
    ```

### 4. GET Paginated Members List (With Filter, Search, and Department Security)
*   **Method**: `GET`
*   **Path**: `/records/members?page=1&itemsPerPage=25&search=John`
*   **Headers**:
    *   `X-Admin-Role`: `HOD`
    *   `X-Admin-Department`: `Multimedia Unit`
*   **Response Payload (`200 OK`)**:
    ```json
    {
      "records": [
        {
          "id": "REC9923",
          "fullName": "John Doe",
          "gender": "Male",
          "email": "johndoe@gmail.com",
          "phoneNumber": "2348011223344",
          "whatsappNumber": "2348011223344",
          "dateOfBirth": "1995-10-14",
          "firstUnit": "Multimedia Unit",
          "secondUnit": "None",
          "assignedHodId": "HOD8813",
          "lastBirthdayBlessedYear": 0,
          "createdAt": "2026-06-15T08:12:00.000Z"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "itemsPerPage": 25,
        "totalRecords": 1,
        "totalPages": 1
      }
    }
    ```

### 5. POST Create Registry Record
*   **Method**: `POST`
*   **Path**: `/records/members`
*   **Request Payload**:
    ```json
    {
      "fullName": "Sister Grace",
      "gender": "Female",
      "email": "grace@gmail.com",
      "phoneNumber": "2348022334455",
      "whatsappNumber": "2348022334455",
      "dateOfBirth": "1998-05-20",
      "firstUnit": "Multimedia Unit",
      "secondUnit": "Prayer Unit",
      "assignedHodId": "HOD8813"
    }
    ```
*   **Response Payload (`201 Created`)**:
    ```json
    {
      "success": true,
      "id": "REC4291",
      "message": "Record registered in members."
    }
    ```

### 6. GET Fetch Single Record details
*   **Method**: `GET`
*   **Path**: `/records/members/REC4291`

### 7. PUT Update Record details
*   **Method**: `PUT`
*   **Path**: `/records/members/REC4291`
*   **Request Payload**:
    ```json
    {
      "fullName": "Sister Grace Johnson",
      "residentialAddress": "12, Glory Avenue, Lagos"
    }
    ```

### 8. DELETE Delete Record
*   **Method**: `DELETE`
*   **Path**: `/records/members/REC4291`
