import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
vus: 150,
duration: '60s',
};

export default function () {
const payload = JSON.stringify({
idempotency_key: `key-${__VU}-${__ITER}`,
card_pan_token: 'tok_4242',
amount_kobo: Math.floor(Math.random() * 50000) + 1000,
currency: 'NGN',
wallet_balance_kobo: 100000,
});

const res = http.post('http://localhost:3000/auth', payload, {
headers: { 'Content-Type': 'application/json' },
});

check(res, {
'status is 200': (r) => r.status === 200,
'approved field exists': (r) => r.json().hasOwnProperty('approved'),
});

sleep(0.01);
}