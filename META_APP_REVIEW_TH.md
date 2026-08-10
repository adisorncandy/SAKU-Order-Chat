# Meta App Review Notes

App: SAKULANGBAN Chat Manager
Production URL: https://saku-order-chat.vercel.app
Privacy Policy URL: https://saku-order-chat.vercel.app/privacy
Data Deletion URL: https://saku-order-chat.vercel.app/data-deletion
Webhook Callback URL: https://saku-order-chat.vercel.app/api/facebook/webhook

## Requested Permission

`pages_messaging`

## Use Case

SAKU Order Chat is used by the Facebook Page admin for "อร่อยหลังบ้าน.พัทลุง" to receive customer Messenger conversations, reply from an internal admin dashboard, and manage customer order information.

The app uses `pages_messaging` only for:

1. Receiving messages that customers send to the connected Facebook Page.
2. Displaying those messages in the private admin dashboard.
3. Sending admin replies back to the same Messenger conversation through the Page.
4. Supporting customer-service and order follow-up workflows for the Page.

The app does not sell, share, or use Messenger data for unrelated advertising. The dashboard is protected by admin login.

## Reviewer Test Steps

1. Open https://saku-order-chat.vercel.app
2. Log in with the admin test password provided in the App Review form.
3. Open the Facebook Page "อร่อยหลังบ้าน.พัทลุง" from another Facebook account or test user.
4. Send a Messenger message to the Page, for example: "สนใจสั่งซื้อสินค้า".
5. Return to the SAKU Order Chat dashboard and open the Facebook chat tab.
6. Confirm the new customer conversation appears in the dashboard.
7. Type an admin reply in the dashboard and send it.
8. Confirm the reply appears in the Messenger conversation.

## Screencast Checklist

The review video should show:

1. The connected Facebook Page.
2. A customer/test account sending a message to the Page.
3. The SAKU Order Chat admin dashboard receiving the message.
4. The admin replying from SAKU Order Chat.
5. The reply appearing back in Messenger.
6. The Privacy Policy page and Data Deletion page URLs.

## Short Permission Explanation

We request `pages_messaging` so our Page admin can receive Messenger messages sent to the Facebook Page "อร่อยหลังบ้าน.พัทลุง" inside our private order-management dashboard and send customer-service replies back to the same Messenger thread. This is required for customer support and order follow-up.
