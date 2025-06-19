// @ts-nocheck
export default function handler(req, res) {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = encodeURIComponent("https://mcp-fitbit.vercel.app/callback");
  const scope = encodeURIComponent("activity heartrate sleep profile");
  const url = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&expires_in=604800`;
  res.writeHead(302, { Location: url });
  res.end();
}
