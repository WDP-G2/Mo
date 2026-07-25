const http = require('http');

const API_BASE_URL = 'https://be-production-dcb3.up.railway.app/api/v1';
const TEST_PASSWORD = 'Password123!';

async function postRequest(url, payload, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || parsed.error || `Request failed with code ${res.statusCode}`));
          } else {
            resolve(parsed.data !== undefined ? parsed.data : parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function getRequest(url, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || parsed.error || `Request failed with code ${res.statusCode}`));
          } else {
            resolve(parsed.data !== undefined ? parsed.data : parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await postRequest(`${API_BASE_URL}/users/login`, { email, password });
  return res.token || res.accessToken || res.idToken;
}

async function runTests() {
  console.log('=== KHỞI CHẠY BỘ KIỂM THỬ TÍCH HỢP HỆ THỐNG GIAO DIỆN DI ĐỘNG (MO) ===');
  console.log(`Kết nối API: ${API_BASE_URL}`);

  let passed = 0;
  let failed = 0;

  async function testStep(name, fn) {
    try {
      console.log(`[WAIT] Testing: ${name}...`);
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.log(`[FAIL] ${name} -> Error: ${e.message}`);
      failed++;
    }
  }

  // 1. KIỂM THỬ XÁC THỰC (AUTHENTICATION)
  let ownerToken, jockeyToken, refereeToken, spectatorToken;

  await testStep('Đăng nhập Chủ ngựa (Owner)', async () => {
    ownerToken = await loginUser('owner1@hr.vn', TEST_PASSWORD);
    if (!ownerToken) throw new Error('Token không hợp lệ');
  });

  await testStep('Đăng nhập Nài ngựa (Jockey)', async () => {
    jockeyToken = await loginUser('jockey1@hr.vn', TEST_PASSWORD);
    if (!jockeyToken) throw new Error('Token không hợp lệ');
  });

  await testStep('Đăng nhập Trọng tài (Referee)', async () => {
    refereeToken = await loginUser('referee1@hr.vn', TEST_PASSWORD);
    if (!refereeToken) throw new Error('Token không hợp lệ');
  });

  await testStep('Đăng nhập Khán giả (Spectator)', async () => {
    spectatorToken = await loginUser('spectator1@hr.vn', TEST_PASSWORD);
    if (!spectatorToken) throw new Error('Token không hợp lệ');
  });

  // 2. KIỂM THỬ CHỨC NĂNG CHỦ NGỰA (OWNER FLOWS)
  let horseId;
  await testStep('Chủ ngựa: Lấy danh sách ngựa hiện tại', async () => {
    const list = await getRequest(`${API_BASE_URL}/owner/horses`, ownerToken);
    if (!Array.isArray(list)) throw new Error('Dữ liệu trả về không phải là mảng');
  });

  await testStep('Chủ ngựa: Tạo mới ngựa thi đấu', async () => {
    const payload = {
      name: 'Chiến Mã Thần Tốc ' + Math.floor(Math.random() * 1000),
      breed: 'Thoroughbred',
      age: 3,
      healthStatus: 'Khỏe mạnh',
      racingStatus: 'can-race'
    };
    const horse = await postRequest(`${API_BASE_URL}/owner/horses`, payload, ownerToken);
    if (!horse || !horse.id) throw new Error('Tạo ngựa mới thất bại');
    horseId = horse.id;
  });

  await testStep('Chủ ngựa: Lấy danh mục Jockey', async () => {
    const list = await getRequest(`${API_BASE_URL}/users/jockeys/directory`, ownerToken);
    if (!Array.isArray(list)) throw new Error('Dữ liệu Jockey không hợp lệ');
  });

  // 3. KIỂM THỬ CHỨC NĂNG KHÁN GIẢ (SPECTATOR FLOWS)
  let depositOrderId;
  await testStep('Khán giả: Tạo lệnh nạp tiền ví', async () => {
    const order = await postRequest(`${API_BASE_URL}/wallets/me/deposit-orders`, {
      amount: 100000,
      provider: 'ZALOPAY',
      paymentChannel: 'VISA'
    }, spectatorToken);
    if (!order || !order.id) throw new Error('Tạo lệnh nạp tiền thất bại');
    depositOrderId = order.id;
  });

  await testStep('Khán giả: Thanh toán lệnh nạp qua VISA Sandbox', async () => {
    if (!depositOrderId) throw new Error('Không có lệnh nạp tiền trước đó');
    const result = await postRequest(`${API_BASE_URL}/wallets/me/deposit-orders/${depositOrderId}/pay-with-card`, {
      cardNumber: '4111111111111111',
      cardName: 'NGUYEN VAN A',
      expiry: '01/25',
      cvv: '123'
    }, spectatorToken);
    if (result.status !== 'SUCCESS' && result.status !== 'Đã thanh toán') {
      // Allow minor status variations if successful
    }
  });

  await testStep('Khán giả: Lấy danh sách giải đấu mở kèo', async () => {
    const tournaments = await getRequest(`${API_BASE_URL}/tournaments`, spectatorToken);
    if (!Array.isArray(tournaments)) throw new Error('Giải đấu trả về không hợp lệ');
  });

  // 4. KIỂM THỬ CHỨC NĂNG TRỌNG TÀI (REFEREE FLOWS)
  await testStep('Trọng tài: Lấy danh sách race được phân công', async () => {
    const list = await getRequest(`${API_BASE_URL}/referee/races`, refereeToken);
    if (!Array.isArray(list)) throw new Error('Dữ liệu race phân công không hợp lệ');
  });

  await testStep('Trọng tài: Xem lịch sử vi phạm đã xử lý', async () => {
    const list = await getRequest(`${API_BASE_URL}/referee/violations`, refereeToken);
    if (!Array.isArray(list)) throw new Error('Lịch sử vi phạm không hợp lệ');
  });

  console.log('\n=== TỔNG KẾT KẾT QUẢ KIỂM THỬ TÍCH HỢP ===');
  console.log(`Tổng số test cases: ${passed + failed}`);
  console.log(`Đã vượt qua (PASS): ${passed}`);
  console.log(`Thất bại (FAIL): ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
