import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	vus: 150,
	duration: '60s',
};

export default function () {
	const payload = JSON.stringify({
		currency: 'NGN',
		wallet_balance_kobo: 100000,
		card_pan_token: 'TEST_TOKEN',
		amount_kobo: Math.floor(Math.random() * 50000) + 1000,
		idempotency_key: `key-${__VU * Math.floor(Math.random() * 99999999999999)}-${__ITER}`,
	});

	const testResponse = http.get('http://localhost:3000/health');
	if (testResponse.status !== 200) {
		console.error('Test server is not running');
		return;
	}

	const res = http.post('http://localhost:3000/auth', payload, {
		headers: { 'Content-Type': 'application/json' },
	});

	check(res, {
		'status is 201': (r) => r.status === 201,
		'approved field exists': (r) =>
			r.json().hasOwnProperty('data') &&
			r.json().data.hasOwnProperty('approved'),
	});

	sleep(0.01);
}
