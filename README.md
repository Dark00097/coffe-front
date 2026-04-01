# Coffee Ordering Frontend

## Environment

Create `coffee-ordering-frontend/.env` from `coffee-ordering-frontend/.env.example`.

Required variables:

- `VITE_API_URL`: public base URL of the backend, for example `https://api.example.com`

## Stripe flow

This frontend uses Stripe-hosted Checkout.

- Customers choose `cash` or `stripe` in the cart.
- Stripe orders are created first in your backend.
- The customer completes payment from the order waiting page.
- After Stripe redirects back, the page refreshes order state and waits for webhook confirmation.

No Stripe publishable key is required in the frontend because card entry is handled on Stripe-hosted Checkout.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
