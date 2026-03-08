export default function setup() {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-key-for-testing-only';
}
