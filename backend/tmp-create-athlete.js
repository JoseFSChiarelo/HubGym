require('dotenv/config');

const API = process.env.API_URL || 'http://localhost:3001';

async function main() {
  const loginResp = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marioP@email.com', password: '123456' })
  });
  if (!loginResp.ok) throw new Error(`login failed: ${loginResp.status}`);
  const loginData = await loginResp.json();
  console.log('login user', loginData.user);
  const token = loginData.token;

  const email = `aluno${Date.now()}@email.com`;
  const createResp = await fetch(`${API}/personal/athletes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Aluno Teste',
      email,
      password: '123456',
      age: 25,
      paymentMethod: 'PIX'
    })
  });
  const body = await createResp.json();
  if (!createResp.ok) {
    throw new Error(`create failed: ${createResp.status} ${JSON.stringify(body)}`);
  }
  console.log('created athlete', body);
}

main().catch((err) => {
  console.error('error', err.message || err);
});
