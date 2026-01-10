# Azure Credential Setup Guide (Updated for Microsoft Entra ID)

This guide walks you through setting up Azure credentials to enable cost syncing from the **Azure Cost Management API** to the **SmartProducts Platform**.

> **Note**: Azure Active Directory (Azure AD) is now called **Microsoft Entra ID**.
> You may still see "Azure AD" in some places. It's the same service.

---

## Overview

To sync Azure costs, you need to:

1. Create an **App Registration (Service Principal)** in Microsoft Entra ID
2. Grant it the **Cost Management Reader** role on your Azure subscription
3. Collect required credentials:

   - Subscription ID
   - Tenant ID
   - Client ID
   - Client Secret

4. Configure these credentials in the SmartProducts Platform

---

## Prerequisites

- An active Azure subscription
- **Owner** or **User Access Administrator** permissions on the subscription
- Access to the **Azure Portal**: [https://portal.azure.com](https://portal.azure.com)

---

## Step-by-Step Instructions

---

## Step 1: Create an App Registration (Service Principal)

1. **Sign in to Azure Portal**

   - [https://portal.azure.com](https://portal.azure.com)

2. **Navigate to Microsoft Entra ID**

   - Use the top search bar
   - Search for **Microsoft Entra ID**
   - (You may still see "Azure Active Directory" in some tenants)

3. **Go to App registrations**

   - Left menu → **App registrations**
   - Click **+ New registration**

4. **Register the application**

   - **Name**:
     `SmartProducts Cost Management`
   - **Supported account types**:
     `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**:
     Leave blank (not required for service-to-service auth)
   - Click **Register**

5. **Copy required IDs**
   On the **Overview** page, copy and securely store:

   - **Application (client) ID** → _Client ID_
   - **Directory (tenant) ID** → _Tenant ID_

---

## Step 2: Create a Client Secret

1. In your App Registration, go to:

   - **Certificates & secrets**

2. Click **+ New client secret**

   - **Description**: `SmartProducts Cost Sync`
   - **Expiration**:
     12 or 24 months (recommended for production)
   - Click **Add**

3. **Immediately copy the secret VALUE**

   - ⚠️ This value is shown **once**
   - Store it securely
   - This is your **Client Secret**

---

## Step 3: Assign Cost Management Reader Role

1. **Navigate to Subscriptions**

   - Search for **Subscriptions**
   - Select the subscription you want to sync

2. Open **Access control (IAM)**

3. Click **+ Add** → **Add role assignment**

4. **Select role**

   - Role: **Cost Management Reader**
   - Click **Next**

5. **Assign access**

   - Assign access to:
     `User, group, or service principal`
   - Click **+ Select members**
   - Search for your App Registration name
   - Select it → **Select**

6. **Review + assign**

   - Click **Next**
   - Click **Review + assign**
   - Wait for confirmation (can take a few minutes to propagate)

---

## Step 4: Get Subscription ID

1. Go to **Subscriptions**
2. Select your subscription
3. Copy the **Subscription ID** (GUID format)

---

## Step 5: Configure in SmartProducts Platform

1. Go to:

   - **Organization → Cloud Configurations**
   - Select **Azure**

2. Click **Add Configuration**

3. Fill in:

   **Required**

   - **Name**: `Azure Production`
   - **Subscription ID**
   - **Tenant ID**
   - **Client ID**
   - **Client Secret**

   **Optional**

   - **Region**
   - **Set as active**

4. Click **Test Connection**

   - Expect a success confirmation

5. Click **Save Configuration**

---

## Using Azure Cost Sync

1. Open your product
2. Go to **Costs**
3. Click **Sync Cloud Costs**
4. Select **Azure**
5. Choose configuration
6. Select date range
7. **Preview** (optional)
8. Click **Sync Costs**

---

## Troubleshooting (Updated)

### ❌ Azure authentication failed

**Causes**

- Incorrect Tenant ID / Client ID / Secret
- Expired secret

**Fix**

- Re-copy values carefully
- Rotate the client secret if expired

---

### ❌ Access denied / missing Cost Management Reader

**Causes**

- Role not assigned at subscription level
- Role propagation delay

**Fix**

- Verify IAM assignment on the correct subscription
- Wait 5–10 minutes and retry

---

### ❌ No cost data found

**Causes**

- Azure cost processing delay (24–48 hrs)
- Date range too recent

**Fix**

- Use a range from 2–3 days ago
- Verify costs exist in Azure Cost Management

---

## Security Best Practices (Still Valid)

- Rotate secrets regularly
- Use **Cost Management Reader only**
- Never commit secrets to Git
- Use separate app registrations per environment

---

## Key Naming Clarification (Important)

| Old Term               | New Term           |
| ---------------------- | ------------------ |
| Azure Active Directory | Microsoft Entra ID |
| Service Principal      | App Registration   |
| Azure AD Tenant        | Entra ID Tenant    |

You may see **both** names in the portal. They refer to the same system.

---

## Additional Resources

- [Azure Service Principal Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Azure Cost Management API Documentation](https://docs.microsoft.com/en-us/rest/api/cost-management/)
- [Azure RBAC Roles](https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#cost-management-reader)

## Support

If you encounter issues not covered in this guide:

1. Check the troubleshooting section above
2. Verify all steps were completed correctly
3. Review Azure Portal for any error messages
4. Contact your Azure administrator if role assignments are needed
